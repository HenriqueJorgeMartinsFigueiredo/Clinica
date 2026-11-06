import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ANAMNESE } from "@/lib/anamnese";
import { STATUS, age, fmtDate, fmtDateTime, todayKey, whatsappLink } from "@/lib/utils";
import { Icon } from "@/components/Icon";
import { PatientDocuments, PatientFinance } from "./PatientFinance";
import { addEvolution, deletePhoto, saveAnamnesis, togglePatientActive, uploadPhotos } from "../actions";

const TABS = [
  { key: "dados", label: "Dados" },
  { key: "anamnese", label: "Anamnese" },
  { key: "evolucao", label: "Evolução" },
  { key: "fotos", label: "Fotos" },
  { key: "agendamentos", label: "Agendamentos" },
  { key: "financeiro", label: "Financeiro" },
  { key: "documentos", label: "Documentos" },
];

export default async function PatientPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ aba?: string; editar?: string }> }) {
  const s = await requireUser();
  const { id } = await params;
  const { aba = "dados", editar } = await searchParams;
  const p = await db.patient.findUnique({
    where: { id },
    include: {
      anamneses: { orderBy: { createdAt: "desc" } },
      evolutions: { orderBy: { date: "desc" }, include: { professional: true, procedure: true } },
      photos: { orderBy: { takenAt: "desc" } },
      appointments: { orderBy: { start: "desc" }, include: { professional: true, procedure: true } },
    },
  });
  if (!p) notFound();

  const wa = whatsappLink(p.phone, `Olá, ${p.name.split(" ")[0]}! Tudo bem? 😊`);
  const a = age(p.birthDate);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="card flex flex-wrap items-center gap-4 p-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-xl font-semibold text-brand-700">
          {p.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold">{p.name}</h1>
          <p className="text-sm text-stone-500">
            {[a != null ? `${a} anos` : null, p.phone, `Cliente desde ${fmtDate(p.createdAt)}`].filter(Boolean).join(" · ")}
          </p>
          {!p.active && <span className="badge mt-1 border-red-300 bg-red-50 text-red-700">Inativa</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {wa && <a href={wa} target="_blank" className="btn bg-emerald-600 text-white hover:bg-emerald-700"><Icon name="whatsapp" className="h-4 w-4" /> WhatsApp</a>}
          <Link href={`/pacientes/${p.id}/editar`} className="btn-secondary">Editar</Link>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-stone-200">
        {TABS.map((t) => (
          <Link key={t.key} href={`?aba=${t.key}`}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm ${aba === t.key ? "border-brand-600 font-medium text-brand-700" : "border-transparent text-stone-500 hover:text-stone-800"}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {aba === "dados" && (
        <div className="card grid gap-4 p-5 sm:grid-cols-2">
          <Info label="Celular" value={p.phone} />
          <Info label="E-mail" value={p.email} />
          <Info label="CPF" value={p.cpf} />
          <Info label="Nascimento" value={p.birthDate ? fmtDate(p.birthDate, { timeZone: "UTC" }) : null} />
          <Info label="Sexo" value={p.gender} />
          <Info label="Profissão" value={p.occupation} />
          <Info label="Endereço" value={p.address} />
          <Info label="Como conheceu" value={p.origin} />
          <div className="sm:col-span-2"><Info label="Observações" value={p.notes} /></div>
          {s.role === "ADMIN" && (
            <form action={togglePatientActive.bind(null, p.id)} className="sm:col-span-2">
              <button className="text-sm text-stone-500 underline hover:text-red-600">
                {p.active ? "Inativar cliente" : "Reativar cliente"}
              </button>
            </form>
          )}
        </div>
      )}

      {aba === "anamnese" && (() => {
        const last = p.anamneses[0] ? (JSON.parse(p.anamneses[0].data) as Record<string, string>) : null;
        const editing = !last || editar;
        if (!editing) {
          return (
            <div className="card space-y-5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-stone-500">Preenchida em {fmtDateTime(p.anamneses[0].createdAt)}
                  {p.anamneses.length > 1 && ` · ${p.anamneses.length} versões`}</p>
                <Link href="?aba=anamnese&editar=1" className="btn-secondary btn-sm">Atualizar anamnese</Link>
              </div>
              {ANAMNESE.filter((sec) => sec.questions.some((q) => last![q.key])).map((sec) => (
                <section key={sec.section}>
                  <h3 className="mb-2 text-sm font-semibold text-brand-700">{sec.section}</h3>
                  <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                    {sec.questions.map((q) => {
                      const v = last![q.key];
                      const det = last![`${q.key}_detalhe`];
                      if (!v) return null;
                      const alert = q.type === "yesno" && v === "Sim";
                      return (
                        <div key={q.key} className={alert ? "rounded bg-amber-50 px-2 py-1" : "px-2 py-1"}>
                          <dt className="text-xs text-stone-500">{q.label}</dt>
                          <dd className={`text-sm ${alert ? "font-medium text-amber-800" : ""}`}>{v}{det ? ` — ${det}` : ""}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </section>
              ))}
            </div>
          );
        }
        return (
          <form action={saveAnamnesis.bind(null, p.id)} className="card space-y-6 p-5">
            {ANAMNESE.map((sec) => (
              <section key={sec.section} className="space-y-3">
                <h3 className="text-sm font-semibold text-brand-700">{sec.section}</h3>
                {sec.questions.map((q) => (
                  <div key={q.key}>
                    <label className="label">{q.label}</label>
                    {q.type === "yesno" ? (
                      <div className="flex flex-wrap items-center gap-4">
                        {["Não", "Sim"].map((o) => (
                          <label key={o} className="flex items-center gap-1.5 text-sm">
                            <input type="radio" name={q.key} value={o} defaultChecked={last?.[q.key] === o} /> {o}
                          </label>
                        ))}
                        {q.detail && <input name={`${q.key}_detalhe`} placeholder={q.detail} className="input min-w-0 flex-1" defaultValue={last?.[`${q.key}_detalhe`]} />}
                      </div>
                    ) : q.type === "select" ? (
                      <select name={q.key} className="input" defaultValue={last?.[q.key] ?? ""}>
                        <option value="">—</option>
                        {q.options.map((o) => <option key={o}>{o}</option>)}
                      </select>
                    ) : q.type === "textarea" ? (
                      <textarea name={q.key} rows={2} className="input" defaultValue={last?.[q.key]} />
                    ) : (
                      <input name={q.key} className="input" defaultValue={last?.[q.key]} />
                    )}
                  </div>
                ))}
              </section>
            ))}
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="declaracao" value="Cliente declara que as informações são verdadeiras" required className="mt-1" />
              A cliente declara que as informações acima são verdadeiras.
            </label>
            <div className="flex justify-end gap-2">
              {last && <Link href="?aba=anamnese" className="btn-secondary">Cancelar</Link>}
              <button className="btn-primary">Salvar anamnese</button>
            </div>
          </form>
        );
      })()}

      {aba === "evolucao" && (
        <EvolutionTab patientId={p.id} evolutions={p.evolutions} />
      )}

      {aba === "fotos" && (
        <div className="space-y-4">
          <form action={uploadPhotos.bind(null, p.id)} className="card flex flex-wrap items-end gap-3 p-4">
            <div className="min-w-48 flex-1">
              <label className="label">Fotos</label>
              <input type="file" name="photos" accept="image/*" multiple required className="input" />
            </div>
            <div>
              <label className="label">Tipo</label>
              <select name="label" className="input"><option value="ANTES">Antes</option><option value="DEPOIS">Depois</option><option value="OUTRO">Outro</option></select>
            </div>
            <div>
              <label className="label">Região</label>
              <input name="region" className="input" placeholder="Ex.: rosto, abdômen" />
            </div>
            <button className="btn-primary"><Icon name="camera" className="h-4 w-4" /> Enviar</button>
          </form>
          {p.photos.length === 0 ? (
            <p className="card p-6 text-center text-sm text-stone-500">Nenhuma foto ainda. No celular, o botão acima abre a câmera.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {p.photos.map((ph) => (
                <figure key={ph.id} className="card overflow-hidden">
                  <a href={`/api/fotos/${ph.id}`} target="_blank">
                    <img src={`/api/fotos/${ph.id}`} alt="" className="aspect-square w-full object-cover" />
                  </a>
                  <figcaption className="flex items-center justify-between gap-1 p-2 text-xs">
                    <span>
                      <span className={`badge mr-1 ${ph.label === "DEPOIS" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-stone-300 bg-stone-50"}`}>
                        {ph.label === "ANTES" ? "Antes" : ph.label === "DEPOIS" ? "Depois" : "Outro"}
                      </span>
                      {ph.region} · {fmtDate(ph.takenAt)}
                    </span>
                    <form action={deletePhoto.bind(null, ph.id)}>
                      <button className="text-stone-400 hover:text-red-600" title="Excluir"><Icon name="x" className="h-4 w-4" /></button>
                    </form>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
      )}

      {aba === "financeiro" && <PatientFinance patientId={p.id} />}
      {aba === "documentos" && <PatientDocuments patientId={p.id} />}

      {aba === "agendamentos" && (
        <div className="card divide-y divide-stone-100">
          {p.appointments.length === 0 && <p className="p-6 text-center text-sm text-stone-500">Nenhum agendamento.</p>}
          {p.appointments.map((ap) => (
            <Link key={ap.id} href={`/agenda?data=${new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(ap.start)}`}
              className="flex flex-wrap items-center gap-3 p-4 hover:bg-stone-50">
              <span className="w-32 text-sm font-medium">{fmtDateTime(ap.start)}</span>
              <span className="flex-1 text-sm">{ap.procedure?.name ?? "Consulta"} <span className="text-stone-500">· {ap.professional.name}</span></span>
              <span className={`badge ${STATUS[ap.status]?.cls}`}>{STATUS[ap.status]?.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-stone-500">{label}</p>
      <p className="whitespace-pre-wrap text-sm">{value || "—"}</p>
    </div>
  );
}

async function EvolutionTab({ patientId, evolutions }: {
  patientId: string;
  evolutions: { id: string; date: Date; text: string; professional: { name: string }; procedure: { name: string } | null }[];
}) {
  const procedures = await db.procedure.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  return (
    <div className="space-y-4">
      <form action={addEvolution.bind(null, patientId)} className="card space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Data</label>
            <input type="date" name="date" className="input" defaultValue={todayKey()} />
          </div>
          <div>
            <label className="label">Procedimento realizado</label>
            <select name="procedureId" className="input">
              <option value="">—</option>
              {procedures.map((pr) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Descrição do atendimento</label>
          <textarea name="text" rows={4} required className="input" placeholder="Produtos usados, lote, parâmetros, região tratada, reações, orientações..." />
        </div>
        <div className="flex justify-end"><button className="btn-primary">Registrar evolução</button></div>
      </form>
      {evolutions.length === 0 ? (
        <p className="card p-6 text-center text-sm text-stone-500">Nenhuma evolução registrada.</p>
      ) : (
        <ol className="relative space-y-3 border-l-2 border-brand-100 pl-5">
          {evolutions.map((e) => (
            <li key={e.id} className="card relative p-4">
              <span className="absolute -left-[27px] top-5 h-3 w-3 rounded-full border-2 border-white bg-brand-500" />
              <p className="text-xs text-stone-500">
                {fmtDate(e.date)} · {e.professional.name}{e.procedure ? ` · ${e.procedure.name}` : ""}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{e.text}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
