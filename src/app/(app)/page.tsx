import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { STATUS, addDays, capFirst, fmtDate, fmtMoney, localToDate, round2, timeKey, todayKey, whatsappLink } from "@/lib/utils";
import { Icon } from "@/components/Icon";

export default async function Dashboard() {
  const s = await requireUser();
  const today = todayKey();
  const start = localToDate(today);
  const end = localToDate(addDays(today, 1));
  const onlyMine = s.role === "PROFISSIONAL" ? { professionalId: s.userId } : {};

  const [appts, totalPatients, tomorrowPending, patientsBday] = await Promise.all([
    db.appointment.findMany({
      where: { start: { gte: start, lt: end }, ...onlyMine },
      include: { patient: true, procedure: true, professional: true },
      orderBy: { start: "asc" },
    }),
    db.patient.count({ where: { active: true } }),
    db.appointment.count({
      where: { start: { gte: end, lt: localToDate(addDays(today, 2)) }, status: "AGENDADO", ...onlyMine },
    }),
    db.patient.findMany({ where: { active: true, birthDate: { not: null } }, select: { id: true, name: true, birthDate: true, phone: true } }),
  ]);

  const showFinance = s.role !== "PROFISSIONAL";
  const [receivedToday, overdueRecs] = showFinance
    ? await Promise.all([
        db.payment.aggregate({ where: { paidAt: { gte: start, lt: end } }, _sum: { amount: true } }),
        db.receivable.findMany({ where: { canceled: false, settledAt: null, dueDate: { lt: start } }, include: { payments: { select: { amount: true } } } }),
      ])
    : [null, []];
  const overdue = round2(overdueRecs.reduce((acc, r) => acc + Math.max(0, r.amount - r.payments.reduce((x, p) => x + p.amount, 0)), 0));

  const month = Number(today.slice(5, 7));
  const birthdays = patientsBday
    .filter((p) => p.birthDate && p.birthDate.getUTCMonth() + 1 === month)
    .sort((a, b) => a.birthDate!.getUTCDate() - b.birthDate!.getUTCDate());

  const count = (st: string) => appts.filter((a) => a.status === st).length;
  const firstName = s.name.split(" ")[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Olá, {firstName}!</h1>
        <p className="text-sm text-stone-500">{capFirst(fmtDate(new Date(), { dateStyle: "full" }))}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Atendimentos hoje" value={appts.filter((a) => a.status !== "CANCELADO").length} />
        <Stat label="Confirmados hoje" value={count("CONFIRMADO")} />
        <Stat label="A confirmar amanhã" value={tomorrowPending} href={`/agenda?data=${addDays(today, 1)}`} />
        <Stat label="Clientes ativas" value={totalPatients} href="/pacientes" />
      </div>
      {showFinance && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Recebido hoje" value={fmtMoney(receivedToday?._sum.amount ?? 0)} href="/financeiro" />
          <Stat label="Parcelas vencidas" value={fmtMoney(overdue)} href="/financeiro/receber?vencidas=1" alert={overdue > 0} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-stone-100 p-4">
            <h2 className="font-semibold">Agenda de hoje</h2>
            <Link href="/agenda" className="text-sm text-brand-700 hover:underline">Abrir agenda</Link>
          </div>
          {appts.length === 0 ? (
            <p className="p-6 text-center text-sm text-stone-500">Nenhum agendamento para hoje.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {appts.map((a) => (
                <li key={a.id} className="flex items-center gap-3 p-4">
                  <div className="w-14 text-sm font-semibold text-stone-700">{timeKey(a.start)}</div>
                  <div className="h-10 w-1 rounded-full" style={{ background: a.professional.color }} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/pacientes/${a.patientId}`} className="block truncate font-medium hover:text-brand-700">
                      {a.patient.name}
                    </Link>
                    <p className="truncate text-xs text-stone-500">
                      {a.procedure?.name ?? "Consulta"} · {a.professional.name}
                    </p>
                  </div>
                  <span className={`badge ${STATUS[a.status]?.cls}`}>{STATUS[a.status]?.label}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="border-b border-stone-100 p-4">
            <h2 className="font-semibold">Aniversariantes do mês 🎂</h2>
          </div>
          {birthdays.length === 0 ? (
            <p className="p-6 text-center text-sm text-stone-500">Nenhum aniversariante este mês.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {birthdays.map((p) => {
                const wa = whatsappLink(p.phone, `Olá, ${p.name.split(" ")[0]}! Feliz aniversário! 🎉 Que seu dia seja lindo. Com carinho, equipe da clínica.`);
                return (
                  <li key={p.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                    <Link href={`/pacientes/${p.id}`} className="truncate hover:text-brand-700">{p.name}</Link>
                    <span className="flex items-center gap-2 text-stone-500">
                      {String(p.birthDate!.getUTCDate()).padStart(2, "0")}/{String(month).padStart(2, "0")}
                      {wa && (
                        <a href={wa} target="_blank" className="text-emerald-600" title="Enviar parabéns no WhatsApp">
                          <Icon name="whatsapp" className="h-4 w-4" />
                        </a>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, href, alert }: { label: string; value: number | string; href?: string; alert?: boolean }) {
  const inner = (
    <div className="card p-4">
      <p className="text-xs text-stone-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${alert ? "text-red-600" : "text-stone-900"}`}>{value}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
