// Dados iniciais. Rode com: npm run db:seed
// Use SEED_DEMO=1 para incluir clientes e agendamentos de exemplo.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const at = (time: string) => new Date(`${today}T${time}:00-03:00`);

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@clinica.com";
  const adminPass = process.env.ADMIN_PASSWORD ?? "trocar123";
  const admin = await db.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { name: "Administradora", email: adminEmail, role: "ADMIN", color: "#b93a62", passwordHash: await bcrypt.hash(adminPass, 10) },
  });

  await db.clinicSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, name: "Clínica de Estética" } });

  if ((await db.procedure.count()) === 0) {
    await db.procedure.createMany({
      data: [
        { name: "Avaliação estética", category: "Avaliação", durationMin: 30, price: 0 },
        { name: "Limpeza de pele profunda", category: "Facial", durationMin: 90, price: 180, supplyCost: 30 },
        { name: "Peeling químico", category: "Facial", durationMin: 60, price: 250, sessions: 4, supplyCost: 40 },
        { name: "Microagulhamento", category: "Facial", durationMin: 60, price: 350, sessions: 3, supplyCost: 60 },
        { name: "Toxina botulínica", category: "Injetáveis", durationMin: 45, price: 1200, commissionPct: 40, supplyCost: 400 },
        { name: "Preenchimento labial", category: "Injetáveis", durationMin: 60, price: 1500, supplyCost: 450 },
        { name: "Bioestimulador de colágeno", category: "Injetáveis", durationMin: 60, price: 2200, sessions: 2, supplyCost: 900 },
        { name: "Drenagem linfática", category: "Corporal", durationMin: 60, price: 150, sessions: 10, supplyCost: 10 },
        { name: "Massagem modeladora", category: "Corporal", durationMin: 60, price: 160, sessions: 10, supplyCost: 10 },
        { name: "Depilação a laser", category: "Laser", durationMin: 30, price: 200, sessions: 8, supplyCost: 15 },
      ],
    });
  }

  if ((await db.consentTemplate.count()) === 0) {
    const procs = await db.procedure.findMany();
    const id = (n: string) => procs.find((p) => p.name === n)?.id;
    await db.consentTemplate.createMany({ data: [
      { title: "Termo geral para procedimentos estéticos", body: TERMO_GERAL },
      { title: "Toxina botulínica", procedureId: id("Toxina botulínica"), body: TERMO_TOXINA },
      { title: "Preenchimento com ácido hialurônico", procedureId: id("Preenchimento labial"), body: TERMO_PREENCHIMENTO },
    ] });
  }

  if (process.env.SEED_DEMO) {
    const pass = await bcrypt.hash("trocar123", 10);
    const ana = await db.user.upsert({ where: { email: "ana@clinica.com" }, update: {}, create: { name: "Ana Souza", email: "ana@clinica.com", role: "PROFISSIONAL", specialty: "Biomédica esteta", color: "#8b5cf6", commissionPct: 30, passwordHash: pass } });
    const bia = await db.user.upsert({ where: { email: "bia@clinica.com" }, update: {}, create: { name: "Beatriz Lima", email: "bia@clinica.com", role: "PROFISSIONAL", specialty: "Esteticista", color: "#0ea5e9", commissionPct: 20, passwordHash: pass } });
    await db.user.upsert({ where: { email: "recepcao@clinica.com" }, update: {}, create: { name: "Carla (Recepção)", email: "recepcao@clinica.com", role: "RECEPCAO", color: "#64748b", passwordHash: pass } });

    const procs = await db.procedure.findMany();
    const proc = (n: string) => procs.find((p) => p.name === n)!;
    const names = ["Mariana Alves", "Juliana Costa", "Fernanda Rocha", "Patrícia Gomes", "Camila Martins", "Larissa Pereira"];
    const patients = [];
    for (const [i, name] of names.entries()) {
      patients.push(await db.patient.create({
        data: { name, phone: `1199${String(1000000 + i * 1234567).slice(0, 7)}`, origin: i % 2 ? "Instagram" : "Indicação",
          birthDate: new Date(Date.UTC(1985 + i * 2, (new Date().getMonth() + (i % 3 === 0 ? 0 : i)) % 12, 5 + i * 3, 15)) },
      }));
    }
    const appts = [
      { p: 0, u: ana, proc: "Toxina botulínica", t: "09:00", st: "CONFIRMADO" },
      { p: 1, u: ana, proc: "Preenchimento labial", t: "10:30", st: "AGENDADO" },
      { p: 2, u: ana, proc: "Avaliação estética", t: "14:00", st: "AGENDADO" },
      { p: 3, u: bia, proc: "Limpeza de pele profunda", t: "08:30", st: "ATENDIDO" },
      { p: 4, u: bia, proc: "Drenagem linfática", t: "11:00", st: "CONFIRMADO" },
      { p: 5, u: bia, proc: "Peeling químico", t: "15:00", st: "AGENDADO" },
      { p: 0, u: admin, proc: "Microagulhamento", t: "16:00", st: "AGENDADO" },
    ];
    for (const a of appts) {
      const pr = proc(a.proc);
      const start = at(a.t);
      await db.appointment.create({
        data: { patientId: patients[a.p].id, professionalId: a.u.id, procedureId: pr.id, start, end: new Date(start.getTime() + pr.durationMin * 60000), status: a.st },
      });
    }
    await db.evolution.create({
      data: { patientId: patients[3].id, professionalId: bia.id, procedureId: proc("Limpeza de pele profunda").id,
        text: "Pele mista com comedões na zona T. Realizada higienização, esfoliação, extração e máscara calmante. Orientado uso de protetor solar FPS 50." },
    });
  }

  console.log(`Pronto! Login: ${adminEmail} / ${adminPass}  (troque a senha depois)`);
}

main().finally(() => db.$disconnect());

// ---------- Modelos de termo (edite em Configurações) ----------
const TERMO_GERAL = `Eu, {{paciente}}, CPF {{cpf}}, declaro que fui devidamente informada pela equipe da {{clinica}} sobre o procedimento de {{procedimento}}, seus objetivos, benefícios esperados, riscos, possíveis efeitos colaterais e cuidados necessários antes e depois da sua realização.

Declaro que respondi com sinceridade à ficha de anamnese, não omitindo informações sobre minha saúde, uso de medicamentos, alergias, gestação ou tratamentos anteriores, ciente de que a omissão de informações pode comprometer o resultado e minha segurança.

Estou ciente de que os resultados em estética variam de pessoa para pessoa, dependem da resposta individual do organismo e dos cuidados domiciliares, não havendo garantia de resultado específico.

Comprometo-me a seguir as orientações recebidas e a comunicar imediatamente à clínica qualquer reação ou intercorrência.

Autorizo o registro fotográfico do antes e depois para fins de acompanhamento do tratamento e prontuário, com garantia de sigilo conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).

Tive a oportunidade de esclarecer todas as minhas dúvidas e, de forma livre e consciente, autorizo a realização do procedimento.`;

const TERMO_TOXINA = `Eu, {{paciente}}, CPF {{cpf}}, {{idade}} anos, autorizo a realização do procedimento de aplicação de toxina botulínica na {{clinica}}.

Fui informada de que o efeito começa a aparecer entre 3 e 15 dias após a aplicação e dura em média de 4 a 6 meses, podendo variar.

Fui informada dos possíveis efeitos adversos, geralmente temporários: dor, vermelhidão, inchaço ou hematoma no local, dor de cabeça, assimetria, queda temporária da pálpebra ou da sobrancelha.

Declaro não estar gestante ou amamentando, não ter doenças neuromusculares (como miastenia gravis) e não fazer uso de medicamentos que interfiram na ação da toxina, conforme informado na anamnese.

Comprometo-me a seguir as orientações pós-procedimento: não deitar nas 4 horas seguintes, não massagear a região, evitar atividade física intensa, calor excessivo e bebidas alcoólicas nas primeiras 24 horas.

Estou ciente de que o retorno para avaliação deve ser feito em até 15 dias.`;

const TERMO_PREENCHIMENTO = `Eu, {{paciente}}, CPF {{cpf}}, autorizo a realização do procedimento de preenchimento com ácido hialurônico na {{clinica}}.

Fui informada de que o ácido hialurônico é absorvido gradualmente pelo organismo, com duração média de 6 a 18 meses, variando conforme a região e o metabolismo.

Fui informada dos possíveis efeitos adversos: dor, inchaço, vermelhidão, hematomas, nódulos, assimetria e, raramente, infecção, reação alérgica ou oclusão vascular, que exige atendimento imediato.

Comprometo-me a comunicar imediatamente à clínica caso perceba dor intensa, mudança de cor da pele (palidez ou manchas arroxeadas) ou alteração na visão.

Comprometo-me a seguir as orientações: evitar maquiagem por 12 horas, calor excessivo, atividade física e bebidas alcoólicas por 24 a 48 horas, e não massagear a região sem orientação.`;
