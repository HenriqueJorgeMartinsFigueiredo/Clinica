"use client";
import { useFormAction } from "@/lib/useFormAction";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { STATUS, addDays, capFirst, fmtDate, localToDate, timeKey, todayKey, whatsappLink } from "@/lib/utils";
import { deleteAppointment, saveAppointment, setAppointmentStatus } from "./actions";

type Appt = {
  id: string; start: string; end: string; status: string; room: string | null; notes: string | null;
  professionalId: string; procedureId: string | null; patientId: string; budgetItemId: string | null;
  patient: { id: string; name: string; phone: string | null };
  procedure: { name: string } | null;
};
type Pro = { id: string; name: string; color: string };
type Proc = { id: string; name: string; durationMin: number };
type Pat = { id: string; name: string; phone: string | null };
type Pkg = { id: string; patientId: string; procedureId: string | null; label: string; done: boolean };

const START_H = 7, END_H = 21, SLOT = 30, ROW_PX = 40; // 30 min = 40px

export function AgendaClient(props: {
  day: string; currentUserId: string; currentRole: string;
  appointments: Appt[]; professionals: Pro[]; procedures: Proc[]; patients: Pat[]; packages: Pkg[];
}) {
  const { day, appointments, professionals, procedures, patients, packages } = props;
  const router = useRouter();
  const defaultFilter = props.currentRole === "PROFISSIONAL" ? props.currentUserId : "todos";
  const [filter, setFilter] = useState(defaultFilter);
  const [modal, setModal] = useState<null | { appt?: Appt; professionalId?: string; time?: string }>(null);

  const cols = filter === "todos" ? professionals : professionals.filter((p) => p.id === filter);
  const visibleAppts = appointments.filter((a) => cols.some((c) => c.id === a.professionalId));
  const slots = useMemo(() => {
    const r: string[] = [];
    for (let m = START_H * 60; m < END_H * 60; m += SLOT)
      r.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
    return r;
  }, []);

  const go = (d: string) => router.push(`/agenda?data=${d}`);

  function position(a: Appt) {
    const dayStart = localToDate(day, `${String(START_H).padStart(2, "0")}:00`).getTime();
    const top = ((new Date(a.start).getTime() - dayStart) / 60000 / SLOT) * ROW_PX;
    const height = Math.max(((new Date(a.end).getTime() - new Date(a.start).getTime()) / 60000 / SLOT) * ROW_PX, 22);
    return { top, height };
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="page-title mr-auto">Agenda</h1>
        <button className="btn-primary" onClick={() => setModal({ professionalId: cols[0]?.id })}>
          <Icon name="plus" className="h-4 w-4" /> Agendar
        </button>
      </div>

      <div className="card flex flex-wrap items-center gap-2 p-3">
        <button className="btn-secondary btn-sm" onClick={() => go(addDays(day, -1))} aria-label="Dia anterior"><Icon name="left" className="h-4 w-4" /></button>
        <button className="btn-secondary btn-sm" onClick={() => go(todayKey())}>Hoje</button>
        <button className="btn-secondary btn-sm" onClick={() => go(addDays(day, 1))} aria-label="Próximo dia"><Icon name="right" className="h-4 w-4" /></button>
        <input type="date" className="input w-auto py-1.5" value={day} onChange={(e) => e.target.value && go(e.target.value)} />
        <span className="text-sm font-medium text-stone-700">{capFirst(fmtDate(localToDate(day, "12:00"), { weekday: "long", day: "numeric", month: "long" }))}</span>
        <select className="input ml-auto w-auto py-1.5" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="todos">Todas as profissionais</option>
          {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {professionals.length === 0 && (
        <p className="card p-6 text-center text-sm text-stone-500">
          Cadastre as profissionais em <Link href="/equipe" className="text-brand-700 underline">Equipe</Link> para usar a agenda.
        </p>
      )}

      {/* Celular: lista */}
      <div className="space-y-2 md:hidden">
        {visibleAppts.length === 0 && <p className="card p-6 text-center text-sm text-stone-500">Nenhum agendamento neste dia.</p>}
        {visibleAppts.map((a) => {
          const pro = professionals.find((p) => p.id === a.professionalId);
          return (
            <button key={a.id} onClick={() => setModal({ appt: a })} className="card flex w-full items-center gap-3 p-3 text-left">
              <div className="w-12 text-sm font-semibold">{timeKey(new Date(a.start))}</div>
              <div className="h-10 w-1 rounded-full" style={{ background: pro?.color }} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{a.patient.name}</p>
                <p className="truncate text-xs text-stone-500">{a.procedure?.name ?? "Consulta"} · {pro?.name}</p>
              </div>
              <span className={`badge ${STATUS[a.status]?.cls}`}>{STATUS[a.status]?.label}</span>
            </button>
          );
        })}
      </div>

      {/* Computador: grade */}
      {cols.length > 0 && (
        <div className="card hidden overflow-x-auto md:block">
          <div className="grid min-w-fit" style={{ gridTemplateColumns: `64px repeat(${cols.length}, minmax(180px, 1fr))` }}>
            <div className="sticky left-0 border-b border-stone-200 bg-white" />
            {cols.map((c) => (
              <div key={c.id} className="flex items-center gap-2 border-b border-l border-stone-200 px-3 py-2 text-sm font-medium">
                <span className="h-3 w-3 rounded-full" style={{ background: c.color }} /> {c.name}
              </div>
            ))}
            <div className="sticky left-0 bg-white">
              {slots.map((s) => (
                <div key={s} className="pr-2 text-right text-[11px] text-stone-400" style={{ height: ROW_PX }}>
                  {s.endsWith(":00") ? s : ""}
                </div>
              ))}
            </div>
            {cols.map((c) => (
              <div key={c.id} className="relative border-l border-stone-200">
                {slots.map((s) => (
                  <div
                    key={s}
                    onClick={() => setModal({ professionalId: c.id, time: s })}
                    className={`cursor-pointer border-b hover:bg-brand-50 ${s.endsWith(":00") ? "border-stone-100" : "border-dashed border-stone-100"}`}
                    style={{ height: ROW_PX }}
                  />
                ))}
                {visibleAppts.filter((a) => a.professionalId === c.id).map((a) => {
                  const { top, height } = position(a);
                  return (
                    <button
                      key={a.id}
                      onClick={() => setModal({ appt: a })}
                      className={`absolute inset-x-1 overflow-hidden rounded-md border-l-4 px-2 py-1 text-left text-xs shadow-sm ${STATUS[a.status]?.cls}`}
                      style={{ top, height, borderLeftColor: c.color }}
                    >
                      <p className="truncate font-semibold">{timeKey(new Date(a.start))} {a.patient.name}</p>
                      <p className="truncate opacity-80">{a.procedure?.name ?? "Consulta"}</p>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {modal && (
        <AppointmentModal
          day={day}
          {...modal}
          professionals={professionals}
          procedures={procedures}
          patients={patients}
          packages={packages}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function AppointmentModal(props: {
  day: string; appt?: Appt; professionalId?: string; time?: string;
  professionals: Pro[]; procedures: Proc[]; patients: Pat[]; packages: Pkg[]; onClose: () => void;
}) {
  const { appt, professionals, procedures, patients, onClose } = props;
  const [state, action, pending] = useFormAction(saveAppointment);
  const [busy, startTransition] = useTransition();
  const [patientQuery, setPatientQuery] = useState(appt?.patient.name ?? "");
  const [patientId, setPatientId] = useState(appt?.patientId ?? "");
  const [duration, setDuration] = useState(
    appt ? Math.round((new Date(appt.end).getTime() - new Date(appt.start).getTime()) / 60000) : 60,
  );

  useEffect(() => { if (state?.ok) onClose(); }, [state, onClose]);

  const [procedureId, setProcedureId] = useState(appt?.procedureId ?? "");
  const [budgetItemId, setBudgetItemId] = useState(appt?.budgetItemId ?? "");
  const myPackages = props.packages.filter((p) => p.patientId === patientId && (!p.done || p.id === appt?.budgetItemId));
  const matches = patientId ? [] : patients.filter((p) => p.name.toLowerCase().includes(patientQuery.toLowerCase())).slice(0, 6);
  const isNew = !patientId && patientQuery.trim().length > 1;

  const wa = appt && whatsappLink(
    appt.patient.phone,
    `Olá, ${appt.patient.name.split(" ")[0]}! Passando para confirmar seu horário de ${appt.procedure?.name ?? "atendimento"} no dia ${fmtDate(appt.start, { day: "2-digit", month: "2-digit" })} às ${timeKey(new Date(appt.start))}. Podemos confirmar? 💖`,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{appt ? "Agendamento" : "Novo agendamento"}</h2>
          <button onClick={onClose} aria-label="Fechar"><Icon name="x" /></button>
        </div>

        {appt && (
          <div className="mb-4 space-y-3 rounded-xl bg-stone-50 p-3">
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(STATUS).map(([k, v]) => (
                <button
                  key={k}
                  disabled={busy}
                  onClick={() => startTransition(async () => { await setAppointmentStatus(appt.id, k); onClose(); })}
                  className={`badge ${appt.status === k ? v.cls + " ring-2 ring-offset-1 ring-stone-400" : "border-stone-200 bg-white text-stone-600"}`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/pacientes/${appt.patientId}`} className="btn-secondary btn-sm">Abrir ficha da cliente</Link>
              {!appt.budgetItemId && (
                <Link href={`/pagamentos/novo?agendamento=${appt.id}`} className="btn-secondary btn-sm">Receber pagamento</Link>
              )}
              {wa && (
                <a href={wa} target="_blank" className="btn-sm btn bg-emerald-600 text-white hover:bg-emerald-700">
                  <Icon name="whatsapp" className="h-4 w-4" /> Confirmar no WhatsApp
                </a>
              )}
            </div>
          </div>
        )}

        <form onSubmit={action} className="space-y-3">
          {appt && <input type="hidden" name="id" value={appt.id} />}
          <input type="hidden" name="patientId" value={patientId} />

          <div className="relative">
            <label className="label">Cliente</label>
            <input
              className="input"
              value={patientQuery}
              placeholder="Digite o nome para buscar..."
              onChange={(e) => { setPatientQuery(e.target.value); setPatientId(""); }}
              autoFocus={!appt}
            />
            {matches.length > 0 && patientQuery && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg">
                {matches.map((p) => (
                  <li key={p.id}>
                    <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-brand-50"
                      onClick={() => { setPatientId(p.id); setPatientQuery(p.name); }}>
                      {p.name} <span className="text-xs text-stone-400">{p.phone}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {isNew && (
            <div className="rounded-lg border border-dashed border-brand-300 bg-brand-50 p-3">
              <p className="mb-2 text-xs text-brand-800">Cliente nova — será cadastrada ao salvar.</p>
              <input type="hidden" name="newPatientName" value={patientQuery.trim()} />
              <input name="newPatientPhone" className="input" placeholder="Celular / WhatsApp" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Procedimento</label>
              <select
                name="procedureId"
                className="input"
                value={procedureId}
                onChange={(e) => { setProcedureId(e.target.value); const p = procedures.find((x) => x.id === e.target.value); if (p) setDuration(p.durationMin); }}
              >
                <option value="">— Avaliação / Consulta —</option>
                {procedures.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {myPackages.length > 0 && (
              <div className="col-span-2 rounded-lg bg-violet-50 p-3">
                <label className="label text-violet-800">Sessão de pacote / plano de tratamento</label>
                <select name="budgetItemId" className="input" value={budgetItemId}
                  onChange={(e) => {
                    setBudgetItemId(e.target.value);
                    const pk = props.packages.find((x) => x.id === e.target.value);
                    if (pk?.procedureId) { setProcedureId(pk.procedureId); const p = procedures.find((x) => x.id === pk.procedureId); if (p) setDuration(p.durationMin); }
                  }}>
                  <option value="">Não é sessão de pacote (atendimento avulso)</option>
                  {myPackages.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
                <p className="mt-1 text-xs text-violet-700">A sessão é contada quando o status ficar “Atendido”.</p>
              </div>
            )}
            <div className="col-span-2">
              <label className="label">Profissional</label>
              <select name="professionalId" className="input" defaultValue={appt?.professionalId ?? props.professionalId} required>
                {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Data</label>
              <input type="date" name="date" className="input" required defaultValue={appt ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(appt.start)) : props.day} />
            </div>
            <div>
              <label className="label">Horário</label>
              <input type="time" name="time" step={300} className="input" required defaultValue={appt ? timeKey(new Date(appt.start)) : props.time ?? "09:00"} />
            </div>
            <div>
              <label className="label">Duração (min)</label>
              <input type="number" name="duration" min={5} step={5} className="input" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Sala</label>
              <input name="room" className="input" defaultValue={appt?.room ?? ""} placeholder="Opcional" />
            </div>
          </div>
          <input type="hidden" name="status" value={appt?.status ?? "AGENDADO"} />
          <div>
            <label className="label">Observações</label>
            <textarea name="notes" rows={2} className="input" defaultValue={appt?.notes ?? ""} />
          </div>

          {state?.error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{state.error}</p>}

          <div className="flex items-center gap-2 pt-2">
            {appt && (
              <button type="button" className="btn-secondary text-red-600" disabled={busy}
                onClick={() => { if (confirm("Excluir este agendamento?")) startTransition(async () => { await deleteAppointment(appt.id); onClose(); }); }}>
                Excluir
              </button>
            )}
            <button type="button" className="btn-secondary ml-auto" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" disabled={pending || (!patientId && !isNew)}>{pending ? "Salvando..." : "Salvar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
