import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PAYMENT_METHODS, addDays, capFirst, fmtDate, fmtMoney, localToDate, round2, timeKey, todayKey } from "@/lib/utils";
import { Icon } from "@/components/Icon";

export default async function Caixa({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  await requireUser(["ADMIN", "RECEPCAO"]);
  const { data } = await searchParams;
  const day = data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : todayKey();
  const range = { gte: localToDate(day), lt: localToDate(addDays(day, 1)) };

  const [payments, expenses] = await Promise.all([
    db.payment.findMany({ where: { paidAt: range }, include: { patient: true }, orderBy: { paidAt: "asc" } }),
    db.expense.findMany({ where: { paidAt: range }, orderBy: { paidAt: "asc" } }),
  ]);
  const totalIn = round2(payments.reduce((s, p) => s + p.amount, 0));
  const totalOut = round2(expenses.reduce((s, e) => s + e.amount, 0));
  const byMethod = Object.keys(PAYMENT_METHODS)
    .map((m) => ({
      m,
      inn: round2(payments.filter((p) => p.method === m).reduce((s, p) => s + p.amount, 0)),
      out: round2(expenses.filter((e) => e.method === m).reduce((s, e) => s + e.amount, 0)),
    }))
    .filter((x) => x.inn || x.out);

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-2 p-3">
        <Link href={`?data=${addDays(day, -1)}`} className="btn-secondary btn-sm" aria-label="Dia anterior"><Icon name="left" className="h-4 w-4" /></Link>
        <Link href="?" className="btn-secondary btn-sm">Hoje</Link>
        <Link href={`?data=${addDays(day, 1)}`} className="btn-secondary btn-sm" aria-label="Próximo dia"><Icon name="right" className="h-4 w-4" /></Link>
        <span className="text-sm font-medium">{capFirst(fmtDate(localToDate(day, "12:00"), { weekday: "long", day: "numeric", month: "long" }))}</span>
        <div className="ml-auto flex gap-2">
          <Link href="/pagamentos/novo" className="btn-primary btn-sm"><Icon name="plus" className="h-4 w-4" /> Receber</Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4"><p className="text-xs text-stone-500">Entradas</p><p className="text-xl font-semibold text-emerald-700">{fmtMoney(totalIn)}</p></div>
        <div className="card p-4"><p className="text-xs text-stone-500">Saídas</p><p className="text-xl font-semibold text-red-600">{fmtMoney(totalOut)}</p></div>
        <div className="card p-4"><p className="text-xs text-stone-500">Saldo do dia</p><p className="text-xl font-semibold">{fmtMoney(totalIn - totalOut)}</p></div>
      </div>

      {byMethod.length > 0 && (
        <div className="card p-4">
          <h2 className="mb-2 text-sm font-semibold">Fechamento por forma de pagamento</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-stone-500"><tr><th className="py-1">Forma</th><th className="text-right">Entradas</th><th className="text-right">Saídas</th><th className="text-right">Saldo</th></tr></thead>
            <tbody>
              {byMethod.map((x) => (
                <tr key={x.m} className="border-t border-stone-100">
                  <td className="py-2">{PAYMENT_METHODS[x.m]}</td>
                  <td className="text-right">{fmtMoney(x.inn)}</td>
                  <td className="text-right">{fmtMoney(x.out)}</td>
                  <td className="text-right font-medium">{fmtMoney(x.inn - x.out)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-stone-500">Confira o dinheiro da gaveta com a linha “Dinheiro”.</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="border-b border-stone-100 p-4 font-semibold">Entradas</h2>
          {payments.length === 0 && <p className="p-6 text-center text-sm text-stone-500">Nenhum recebimento.</p>}
          <ul className="divide-y divide-stone-100">
            {payments.map((p) => (
              <li key={p.id}>
                <Link href={`/pagamentos/${p.id}`} className="flex items-center gap-3 p-3 text-sm hover:bg-stone-50">
                  <span className="w-12 text-stone-500">{timeKey(p.paidAt)}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">{p.patient.name}</span><span className="block truncate text-xs text-stone-500">{p.description} · {PAYMENT_METHODS[p.method]}</span></span>
                  <span className="font-medium text-emerald-700">{fmtMoney(p.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2 className="border-b border-stone-100 p-4 font-semibold">Saídas</h2>
          {expenses.length === 0 && <p className="p-6 text-center text-sm text-stone-500">Nenhuma despesa paga.</p>}
          <ul className="divide-y divide-stone-100">
            {expenses.map((e) => (
              <li key={e.id} className="flex items-center gap-3 p-3 text-sm">
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{e.description}</span><span className="block truncate text-xs text-stone-500">{e.category}{e.method && ` · ${PAYMENT_METHODS[e.method]}`}</span></span>
                <span className="font-medium text-red-600">{fmtMoney(e.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
