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

  if ((await db.procedure.count()) === 0) {
    await db.procedure.createMany({
      data: [
        { name: "Avaliação estética", category: "Avaliação", durationMin: 30, price: 0 },
        { name: "Limpeza de pele profunda", category: "Facial", durationMin: 90, price: 180 },
        { name: "Peeling químico", category: "Facial", durationMin: 60, price: 250, sessions: 4 },
        { name: "Microagulhamento", category: "Facial", durationMin: 60, price: 350, sessions: 3 },
        { name: "Toxina botulínica", category: "Injetáveis", durationMin: 45, price: 1200 },
        { name: "Preenchimento labial", category: "Injetáveis", durationMin: 60, price: 1500 },
        { name: "Bioestimulador de colágeno", category: "Injetáveis", durationMin: 60, price: 2200, sessions: 2 },
        { name: "Drenagem linfática", category: "Corporal", durationMin: 60, price: 150, sessions: 10 },
        { name: "Massagem modeladora", category: "Corporal", durationMin: 60, price: 160, sessions: 10 },
        { name: "Depilação a laser", category: "Laser", durationMin: 30, price: 200, sessions: 8 },
      ],
    });
  }

  if (process.env.SEED_DEMO) {
    const pass = await bcrypt.hash("trocar123", 10);
    const ana = await db.user.upsert({ where: { email: "ana@clinica.com" }, update: {}, create: { name: "Ana Souza", email: "ana@clinica.com", role: "PROFISSIONAL", specialty: "Biomédica esteta", color: "#8b5cf6", passwordHash: pass } });
    const bia = await db.user.upsert({ where: { email: "bia@clinica.com" }, update: {}, create: { name: "Beatriz Lima", email: "bia@clinica.com", role: "PROFISSIONAL", specialty: "Esteticista", color: "#0ea5e9", passwordHash: pass } });
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
