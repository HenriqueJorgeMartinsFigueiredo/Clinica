import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PAYMENT_METHODS, addMonths, fmtDate, fmtMoney, monthRange, round2, todayKey } from "@/lib/utils";
import { MonthNav } from "@/components/MonthNav";
import { payCommissions, undoPayout } from "../actions";

export default async function Comissoes({ searchParams }: { searchParams: Promise<{ mes?: string; prof?: string }> }) {
  const s = await requireUser(["ADMIN", "PROFISSIONAL"]);
  const { mes, prof } = await searchParams;
  const ym = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : todayKey().slice(0, 7);
  const { start, end } = monthRange(ym);
  const isAdmin = s.role === "ADMIN";
  const profFilter = isAdmin ? prof : s.userId;
  const untilKey = addMonths(`${ym}-01`, 1);

  const [entries, pros, payouts, olderPending] = await Promise.all([
    db.commissionEntry.findMany({
      where: { payment: { paidAt: { gte: start, lt: end } }, ...(profFilter ? { professionalId: profFilter } : {}) },
      include: { professional: true, payment: { include: { patient: true } } },
      orderBy: { payment: { paidAt: "asc" } },
    }),
    db.user.findMany({ where: { role: { in: ["ADMIN", "PROFISSIONAL"] } }, orderBy: { name: "asc" } }),
    db.commissionPayout.findMany({
      where: { paidAt: { gte: start, lt: end }, ...(profFilter ? { professionalId: profFilter } : {}) },
      include: { professional: true }, orderBy: { paidAt: "desc" },
    }),
    db.commissionEntry.groupBy({
      by: ["professionalId"],
      where: { payoutId: null, payment: { paidAt: { lt: start } }, ...(profFilter ? { professionalId: profFilter } : {}) },
      _sum: { amount: true },
    }),
  ]);

  const summary = pros
    .map((p) => {
      const mine = entries.filter((e) => e.professionalId === p.id);
      const older = olderPending.find((o) => o.professionalId === p.id)?._sum.amount ?? 0;
      return {
        p,
        base: round2(mine.reduce((x, e) => x + e.base, 0)),
        total: round2(mine.reduce((x, e) => x + e.amount, 0)),
        pending: round2(mine.filter((e) => !e.payoutId).reduce((x, e) => x + e.amount, 0) + older),
        older: round2(older),
      };
    })
    .filter((x) => x.total > 0 || x.pending > 0);

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <MonthNav ym={ym} extra={prof ? `&prof=${prof}` : ""} />
        {isAdmin && (
          <div className="ml-auto flex flex-wrap gap-1 text-xs">
            <Link href={`?mes=${ym}`} className={`badge px-3 py-1 ${!prof ? "border-brand-400 bg-brand-50 text-brand-700" : "border-stone-200"}`}>Todas</Link>
            {pros.map((p) => (
              <Link key={p.id} href={`?mes=${ym}&prof=${p.id}`} className={`badge px-3 py-1 ${prof === p.id ? "border-brand-400 bg-brand-50 text-brand-700" : "border-stone-200"}`}>{p.name}</Link>
            ))}
          </div>
        )}
      </div>

      <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-900">
        A comissão é calculada sobre o <b>valor efetivamente pago pela cliente</b>, na data do pagamento. Descontos, parcelas em
        aberto e valores negociados não geram comissão.
      </p>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {summary.length === 0 && <p className="card p-6 text-center text-sm text-stone-500 md:col-span-3">Nenhuma comissão neste mês.</p>}
        {summary.map(({ p, base, total, pending, older }) => (
          <div key={p.id} className="card space-y-2 p-4">
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: p.color }} /><span className="font-semibold">{p.name}</span>
              <span className="ml-auto text-xs text-stone-500">{p.commissionPct}% padrão</span></div>
            <div className="flex justify-between text-sm"><span className="text-stone-500">Recebido das clientes</span><span>{fmtMoney(base)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-stone-500">Comissão do mês</span><span className="font-semibold">{fmtMoney(total)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-stone-500">A pagar{older > 0 && " (inclui meses anteriores)"}</span><span className="font-semibold text-amber-700">{fmtMoney(pending)}</span></div>
            {isAdmin && pending > 0 && (
              <form action={payCommissions.bind(null, p.id, untilKey)} className="flex gap-2 pt-1">
                <select name="method" className="input py-1 text-xs">{Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                <button className="btn-primary btn-sm whitespace-nowrap">Pagar {fmtMoney(pending)}</button>
              </form>
            )}
          </div>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <h2 className="border-b border-stone-100 p-4 font-semibold">Detalhamento</h2>
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs text-stone-500">
            <tr><th className="p-3">Data</th><th className="p-3">Cliente</th>{!profFilter && <th className="p-3">Profissional</th>}<th className="p-3 text-right">Valor pago</th><th className="p-3 text-right">%</th><th className="p-3 text-right">Comissão</th><th className="p-3" /></tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="p-3">{fmtDate(e.payment.paidAt, { day: "2-digit", month: "2-digit" })}</td>
                <td className="p-3">{isAdmin ? <Link href={`/pagamentos/${e.paymentId}`} className="hover:text-brand-700">{e.payment.patient.name}</Link> : e.payment.patient.name}
                  <span className="block text-xs text-stone-500">{e.payment.description}</span></td>
                {!profFilter && <td className="p-3">{e.professional.name}</td>}
                <td className="p-3 text-right">{fmtMoney(e.base)}</td>
                <td className="p-3 text-right">{e.pct}%</td>
                <td className="p-3 text-right font-medium">{fmtMoney(e.amount)}</td>
                <td className="p-3">{e.payoutId ? <span className="badge border-emerald-300 bg-emerald-50 text-emerald-700">Paga</span> : <span className="badge border-amber-300 bg-amber-50 text-amber-700">Pendente</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {payouts.length > 0 && (
        <div className="card">
          <h2 className="border-b border-stone-100 p-4 font-semibold">Pagamentos de comissão no mês</h2>
          {payouts.map((po) => (
            <div key={po.id} className="flex items-center gap-3 border-t border-stone-100 p-4 text-sm first:border-0">
              <span className="w-14">{fmtDate(po.paidAt, { day: "2-digit", month: "2-digit" })}</span>
              <span className="flex-1">{po.professional.name}</span>
              <span className="font-medium">{fmtMoney(po.amount)}</span>
              {isAdmin && <form action={undoPayout.bind(null, po.id)}><button className="text-xs text-stone-400 underline hover:text-red-600">desfazer</button></form>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
