import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmtDate, fmtMoney, localToDate, monthRange, receivableStatus, round2, todayKey, whatsappLink } from "@/lib/utils";
import { MonthNav } from "@/components/MonthNav";
import { Icon } from "@/components/Icon";

export default async function Receber({ searchParams }: { searchParams: Promise<{ mes?: string; vencidas?: string }> }) {
  await requireUser(["ADMIN", "RECEPCAO"]);
  const { mes, vencidas } = await searchParams;
  const ym = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : todayKey().slice(0, 7);
  const { start, end } = monthRange(ym);

  const where = vencidas
    ? { canceled: false, settledAt: null, dueDate: { lt: localToDate(todayKey()) } }
    : { canceled: false, dueDate: { gte: start, lt: end } };
  const rows = (await db.receivable.findMany({ where, include: { patient: true, payments: true }, orderBy: { dueDate: "asc" } }))
    .map((r) => ({ ...r, paid: round2(r.payments.reduce((s, p) => s + p.amount, 0)) }))
    .map((r) => ({ ...r, st: receivableStatus(r) }))
    .filter((r) => !vencidas || r.st.key !== "PAGA");

  const sum = (f: (r: (typeof rows)[number]) => number) => round2(rows.reduce((s, r) => s + f(r), 0));
  const expected = sum((r) => r.amount);
  const received = sum((r) => r.paid);
  const openAmt = sum((r) => (r.st.key === "PAGA" ? 0 : r.amount - r.paid));

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-3 p-3">
        {!vencidas && <MonthNav ym={ym} />}
        <Link href={vencidas ? "?" : "?vencidas=1"} className={`badge px-3 py-1 ${vencidas ? "border-red-300 bg-red-50 text-red-700" : "border-stone-200"}`}>
          {vencidas ? "← Voltar ao mês" : "Ver todas as vencidas"}
        </Link>
        <Link href="/pagamentos/novo" className="btn-primary btn-sm ml-auto"><Icon name="plus" className="h-4 w-4" /> Receber</Link>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4"><p className="text-xs text-stone-500">Previsto</p><p className="text-xl font-semibold">{fmtMoney(expected)}</p></div>
        <div className="card p-4"><p className="text-xs text-stone-500">Recebido</p><p className="text-xl font-semibold text-emerald-700">{fmtMoney(received)}</p></div>
        <div className="card p-4"><p className="text-xs text-stone-500">Em aberto</p><p className="text-xl font-semibold text-amber-700">{fmtMoney(openAmt)}</p></div>
      </div>
      <div className="card divide-y divide-stone-100">
        {rows.length === 0 && <p className="p-6 text-center text-sm text-stone-500">Nenhuma parcela.</p>}
        {rows.map((r) => {
          const wa = r.st.key === "VENCIDA" || r.st.key === "PARCIAL"
            ? whatsappLink(r.patient.phone, `Olá, ${r.patient.name.split(" ")[0]}! Tudo bem? Passando para lembrar da parcela de ${fmtMoney(r.amount - r.paid)} com vencimento em ${fmtDate(r.dueDate)}. Qualquer dúvida estamos à disposição! 💖`)
            : null;
          return (
            <div key={r.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
              <span className="w-20 text-stone-600">{fmtDate(r.dueDate, { day: "2-digit", month: "2-digit" })}</span>
              <div className="min-w-0 flex-1">
                <Link href={`/pacientes/${r.patientId}?aba=financeiro`} className="block truncate font-medium hover:text-brand-700">{r.patient.name}</Link>
                <p className="truncate text-xs text-stone-500">{r.description}{r.installment && ` · ${r.installment}`}</p>
              </div>
              <span className="font-medium">{fmtMoney(r.amount)}</span>
              <span className={`badge ${r.st.cls}`}>{r.st.label}</span>
              {wa && <a href={wa} target="_blank" className="text-emerald-600" title="Cobrar pelo WhatsApp"><Icon name="whatsapp" /></a>}
              {r.st.key !== "PAGA" && <Link href={`/pagamentos/novo?parcela=${r.id}`} className="btn-primary btn-sm">Receber</Link>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
