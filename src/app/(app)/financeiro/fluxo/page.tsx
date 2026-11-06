import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { capFirst, dateKey, fmtDate, fmtMoney, localToDate, round2, todayKey } from "@/lib/utils";
import { Icon } from "@/components/Icon";

export default async function Fluxo({ searchParams }: { searchParams: Promise<{ ano?: string }> }) {
  await requireUser(["ADMIN"]);
  const { ano } = await searchParams;
  const year = ano && /^\d{4}$/.test(ano) ? Number(ano) : Number(todayKey().slice(0, 4));
  const start = localToDate(`${year}-01-01`), end = localToDate(`${year + 1}-01-01`);

  const [payments, expensesPaid, recs, expensesOpen] = await Promise.all([
    db.payment.findMany({ where: { paidAt: { gte: start, lt: end } }, select: { amount: true, paidAt: true } }),
    db.expense.findMany({ where: { paidAt: { gte: start, lt: end } }, select: { amount: true, paidAt: true } }),
    db.receivable.findMany({ where: { canceled: false, settledAt: null, dueDate: { gte: start, lt: end } }, include: { payments: { select: { amount: true } } } }),
    db.expense.findMany({ where: { paidAt: null, dueDate: { gte: start, lt: end } }, select: { amount: true, dueDate: true } }),
  ]);

  const month = (d: Date) => Number(dateKey(d).slice(5, 7)) - 1;
  const rows = Array.from({ length: 12 }, (_, m) => ({ m, inn: 0, out: 0, toReceive: 0, toPay: 0 }));
  payments.forEach((p) => (rows[month(p.paidAt)].inn += p.amount));
  expensesPaid.forEach((e) => (rows[month(e.paidAt!)].out += e.amount));
  recs.forEach((r) => (rows[month(r.dueDate)].toReceive += Math.max(0, r.amount - r.payments.reduce((s, p) => s + p.amount, 0))));
  expensesOpen.forEach((e) => (rows[month(e.dueDate)].toPay += e.amount));

  let acc = 0;
  const data = rows.map((r) => {
    const result = round2(r.inn - r.out);
    const projected = round2(result + r.toReceive - r.toPay);
    acc = round2(acc + projected);
    return { ...r, result, projected, acc };
  });
  const tot = data.reduce((t, r) => ({ inn: t.inn + r.inn, out: t.out + r.out, toReceive: t.toReceive + r.toReceive, toPay: t.toPay + r.toPay }), { inn: 0, out: 0, toReceive: 0, toPay: 0 });
  const curMonth = year === Number(todayKey().slice(0, 4)) ? Number(todayKey().slice(5, 7)) - 1 : -1;

  return (
    <div className="space-y-4">
      <div className="card flex items-center gap-2 p-3">
        <Link href={`?ano=${year - 1}`} className="btn-secondary btn-sm" aria-label="Ano anterior"><Icon name="left" className="h-4 w-4" /></Link>
        <span className="w-16 text-center font-medium">{year}</span>
        <Link href={`?ano=${year + 1}`} className="btn-secondary btn-sm" aria-label="Próximo ano"><Icon name="right" className="h-4 w-4" /></Link>
        <p className="ml-auto hidden text-xs text-stone-500 sm:block">Realizado = o que de fato entrou/saiu. Previsto = parcelas e contas ainda em aberto.</p>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-stone-200 text-right text-xs text-stone-500">
            <tr>
              <th className="p-3 text-left">Mês</th><th className="p-3">Entradas</th><th className="p-3">Saídas</th><th className="p-3">Resultado</th>
              <th className="p-3">A receber</th><th className="p-3">A pagar</th><th className="p-3">Saldo previsto</th><th className="p-3">Acumulado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-right">
            {data.map((r) => (
              <tr key={r.m} className={r.m === curMonth ? "bg-brand-50/60" : ""}>
                <td className="p-3 text-left font-medium">{capFirst(fmtDate(localToDate(`${year}-${String(r.m + 1).padStart(2, "0")}-15`, "12:00"), { month: "long" }))}</td>
                <td className="p-3 text-emerald-700">{fmtMoney(r.inn)}</td>
                <td className="p-3 text-red-600">{fmtMoney(r.out)}</td>
                <td className={`p-3 font-medium ${r.result < 0 ? "text-red-600" : ""}`}>{fmtMoney(r.result)}</td>
                <td className="p-3 text-stone-500">{fmtMoney(r.toReceive)}</td>
                <td className="p-3 text-stone-500">{fmtMoney(r.toPay)}</td>
                <td className={`p-3 ${r.projected < 0 ? "text-red-600" : ""}`}>{fmtMoney(r.projected)}</td>
                <td className={`p-3 font-medium ${r.acc < 0 ? "text-red-600" : ""}`}>{fmtMoney(r.acc)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-stone-200 text-right font-semibold">
            <tr>
              <td className="p-3 text-left">Total</td><td className="p-3">{fmtMoney(tot.inn)}</td><td className="p-3">{fmtMoney(tot.out)}</td>
              <td className="p-3">{fmtMoney(tot.inn - tot.out)}</td><td className="p-3">{fmtMoney(tot.toReceive)}</td><td className="p-3">{fmtMoney(tot.toPay)}</td>
              <td className="p-3" colSpan={2}>{fmtMoney(tot.inn - tot.out + tot.toReceive - tot.toPay)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
