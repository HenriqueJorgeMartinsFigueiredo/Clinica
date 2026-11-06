import Link from "next/link";
import { db } from "@/lib/db";
import { budgetTotals } from "@/lib/finance";
import { BUDGET_STATUS, PAYMENT_METHODS, fmtDate, fmtMoney, receivableStatus, round2 } from "@/lib/utils";

export async function PatientFinance({ patientId }: { patientId: string }) {
  const [budgets, receivables, payments] = await Promise.all([
    db.budget.findMany({
      where: { patientId },
      include: { items: { include: { appointments: { where: { status: "ATENDIDO" }, select: { id: true } } } } },
      orderBy: { number: "desc" },
    }),
    db.receivable.findMany({ where: { patientId, canceled: false }, include: { payments: true }, orderBy: { dueDate: "asc" } }),
    db.payment.findMany({ where: { patientId }, orderBy: { paidAt: "desc" } }),
  ]);
  const recs = receivables.map((r) => ({ ...r, paid: round2(r.payments.reduce((s, p) => s + p.amount, 0)) })).map((r) => ({ ...r, st: receivableStatus(r) }));
  const openRecs = recs.filter((r) => r.st.key !== "PAGA");
  const owed = round2(openRecs.reduce((s, r) => s + r.amount - r.paid, 0));
  const overdue = round2(openRecs.filter((r) => r.st.key === "VENCIDA" || r.st.label.includes("vencida")).reduce((s, r) => s + r.amount - r.paid, 0));
  const totalPaid = round2(payments.reduce((s, p) => s + p.amount, 0));
  const packages = budgets.filter((b) => b.status === "APROVADO").flatMap((b) => b.items.filter((i) => i.quantity > 1 || i.appointments.length).map((i) => ({ ...i, budgetNumber: b.number, budgetId: b.id })));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4"><p className="text-xs text-stone-500">Total já pago</p><p className="text-xl font-semibold text-emerald-700">{fmtMoney(totalPaid)}</p></div>
        <div className="card p-4"><p className="text-xs text-stone-500">Saldo devedor</p><p className="text-xl font-semibold text-amber-700">{fmtMoney(owed)}</p></div>
        <div className="card p-4"><p className="text-xs text-stone-500">Vencido</p><p className={`text-xl font-semibold ${overdue ? "text-red-600" : ""}`}>{fmtMoney(overdue)}</p></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/orcamentos/novo?paciente=${patientId}`} className="btn-secondary">+ Orçamento</Link>
        <Link href={`/pagamentos/novo?paciente=${patientId}`} className="btn-primary">Receber pagamento</Link>
      </div>

      {packages.length > 0 && (
        <section className="card">
          <h3 className="border-b border-stone-100 p-4 font-semibold">Pacotes e sessões</h3>
          {packages.map((i) => {
            const pct = Math.min(100, (i.appointments.length / i.quantity) * 100);
            return (
              <div key={i.id} className="border-t border-stone-100 p-4 text-sm first:border-0">
                <div className="mb-1 flex justify-between">
                  <span className="font-medium">{i.description} <Link href={`/orcamentos/${i.budgetId}`} className="text-xs text-stone-400 hover:underline">nº {i.budgetNumber}</Link></span>
                  <span>{i.appointments.length} de {i.quantity} sessões</span>
                </div>
                <div className="h-2 rounded-full bg-stone-100"><div className="h-2 rounded-full bg-brand-500" style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </section>
      )}

      <section className="card">
        <h3 className="border-b border-stone-100 p-4 font-semibold">Orçamentos</h3>
        {budgets.length === 0 && <p className="p-4 text-sm text-stone-500">Nenhum orçamento.</p>}
        {budgets.map((b) => (
          <Link key={b.id} href={`/orcamentos/${b.id}`} className="flex items-center gap-3 border-t border-stone-100 p-4 text-sm first:border-0 hover:bg-stone-50">
            <span className="w-12 text-stone-400">nº {b.number}</span>
            <span className="min-w-0 flex-1 truncate">{b.items.map((i) => i.description).join(", ")}</span>
            <span className="font-medium">{fmtMoney(budgetTotals(b).total)}</span>
            <span className={`badge ${BUDGET_STATUS[b.status].cls}`}>{BUDGET_STATUS[b.status].label}</span>
          </Link>
        ))}
      </section>

      {openRecs.length > 0 && (
        <section className="card">
          <h3 className="border-b border-stone-100 p-4 font-semibold">Parcelas em aberto</h3>
          {openRecs.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 border-t border-stone-100 p-4 text-sm first:border-0">
              <span className="w-24">{fmtDate(r.dueDate)}</span>
              <span className="flex-1">{r.description} {r.installment && `(${r.installment})`}</span>
              <span className="font-medium">{fmtMoney(r.amount - r.paid)}</span>
              <span className={`badge ${r.st.cls}`}>{r.st.label}</span>
              <Link href={`/pagamentos/novo?parcela=${r.id}`} className="btn-primary btn-sm">Receber</Link>
            </div>
          ))}
        </section>
      )}

      <section className="card">
        <h3 className="border-b border-stone-100 p-4 font-semibold">Pagamentos</h3>
        {payments.length === 0 && <p className="p-4 text-sm text-stone-500">Nenhum pagamento.</p>}
        {payments.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-3 border-t border-stone-100 p-4 text-sm first:border-0">
            <span className="w-24">{fmtDate(p.paidAt)}</span>
            <Link href={`/pagamentos/${p.id}`} className="flex-1 hover:text-brand-700">{p.description ?? "Pagamento"} · {PAYMENT_METHODS[p.method]}</Link>
            <span className="font-medium text-emerald-700">{fmtMoney(p.amount)}</span>
            <a href={`/api/pdf/recibo/${p.id}`} target="_blank" className="text-xs text-brand-700 underline">Recibo nº {p.number}</a>
          </div>
        ))}
      </section>
    </div>
  );
}

export async function PatientDocuments({ patientId }: { patientId: string }) {
  const templates = await db.consentTemplate.findMany({ where: { active: true }, include: { procedure: true }, orderBy: { title: "asc" } });
  return (
    <div className="card">
      <h3 className="border-b border-stone-100 p-4 font-semibold">Termos de consentimento</h3>
      <p className="px-4 pt-3 text-sm text-stone-500">O PDF sai preenchido com os dados da cliente, pronto para imprimir e assinar.</p>
      {templates.length === 0 && <p className="p-4 text-sm text-stone-500">Nenhum modelo. Cadastre em <Link href="/configuracoes" className="underline">Configurações</Link>.</p>}
      <div className="divide-y divide-stone-100">
        {templates.map((t) => (
          <div key={t.id} className="flex items-center gap-3 p-4 text-sm">
            <span className="flex-1 font-medium">{t.title}<span className="block text-xs font-normal text-stone-500">{t.procedure?.name ?? "Geral"}</span></span>
            <a href={`/api/pdf/termo?modelo=${t.id}&paciente=${patientId}`} target="_blank" className="btn-secondary btn-sm">Gerar PDF</a>
          </div>
        ))}
      </div>
    </div>
  );
}
