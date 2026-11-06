import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PAYMENT_METHODS, dateKey, fmtDate, fmtMoney, monthRange, round2, todayKey } from "@/lib/utils";
import { MonthNav } from "@/components/MonthNav";
import { ExpenseForm } from "./ExpenseForm";
import { deleteExpense, payExpense, unpayExpense } from "../actions";

export default async function Pagar({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  await requireUser(["ADMIN"]);
  const { mes } = await searchParams;
  const ym = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : todayKey().slice(0, 7);
  const { start, end } = monthRange(ym);
  const today = todayKey();
  const rows = await db.expense.findMany({
    where: { OR: [{ dueDate: { gte: start, lt: end } }, { paidAt: { gte: start, lt: end } }] },
    orderBy: [{ paidAt: { sort: "asc", nulls: "first" } }, { dueDate: "asc" }],
  });
  const total = round2(rows.reduce((s, e) => s + e.amount, 0));
  const paid = round2(rows.filter((e) => e.paidAt).reduce((s, e) => s + e.amount, 0));
  const byCat = Object.entries(
    rows.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.category]: (acc[e.category] ?? 0) + e.amount }), {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <MonthNav ym={ym} />
        <div className="ml-auto"><ExpenseForm /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4"><p className="text-xs text-stone-500">Total do mês</p><p className="text-xl font-semibold">{fmtMoney(total)}</p></div>
        <div className="card p-4"><p className="text-xs text-stone-500">Pago</p><p className="text-xl font-semibold text-emerald-700">{fmtMoney(paid)}</p></div>
        <div className="card p-4"><p className="text-xs text-stone-500">A pagar</p><p className="text-xl font-semibold text-red-600">{fmtMoney(total - paid)}</p></div>
      </div>
      <div className="card divide-y divide-stone-100">
        {rows.length === 0 && <p className="p-6 text-center text-sm text-stone-500">Nenhuma conta neste mês.</p>}
        {rows.map((e) => {
          const overdue = !e.paidAt && dateKey(e.dueDate) < today;
          return (
            <div key={e.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
              <span className={`w-14 ${overdue ? "font-medium text-red-600" : "text-stone-600"}`}>{fmtDate(e.dueDate, { day: "2-digit", month: "2-digit" })}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{e.description}</p>
                <p className="truncate text-xs text-stone-500">{e.category}{e.supplier && ` · ${e.supplier}`}</p>
              </div>
              <span className="font-medium">{fmtMoney(e.amount)}</span>
              {e.paidAt ? (
                <>
                  <span className="badge border-emerald-300 bg-emerald-50 text-emerald-700">Paga {fmtDate(e.paidAt, { day: "2-digit", month: "2-digit" })}{e.method && ` · ${PAYMENT_METHODS[e.method]}`}</span>
                  {!e.payoutId && <form action={unpayExpense.bind(null, e.id)}><button className="text-xs text-stone-400 underline">desfazer</button></form>}
                </>
              ) : (
                <>
                  {overdue && <span className="badge border-red-300 bg-red-50 text-red-700">Vencida</span>}
                  <form action={payExpense.bind(null, e.id)} className="flex items-center gap-1">
                    <input type="hidden" name="paidAt" value={today} />
                    <select name="method" className="input w-auto py-1 text-xs">{Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                    <button className="btn-primary btn-sm">Pagar</button>
                  </form>
                  <form action={deleteExpense.bind(null, e.id)}><button className="text-xs text-stone-400 underline hover:text-red-600">excluir</button></form>
                </>
              )}
            </div>
          );
        })}
      </div>
      {byCat.length > 0 && (
        <div className="card p-4">
          <h2 className="mb-2 text-sm font-semibold">Por categoria</h2>
          {byCat.map(([c, v]) => (
            <div key={c} className="flex justify-between border-t border-stone-100 py-1.5 text-sm"><span>{c}</span><span>{fmtMoney(v)}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}
