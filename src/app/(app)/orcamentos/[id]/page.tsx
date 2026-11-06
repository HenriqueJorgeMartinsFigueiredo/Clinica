import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { budgetTotals } from "@/lib/finance";
import { BUDGET_STATUS, fmtDate, fmtMoney, receivableStatus, round2, whatsappLink } from "@/lib/utils";
import { Icon } from "@/components/Icon";
import { ApproveForm } from "./ApproveForm";
import { deleteBudget, setBudgetStatus } from "../actions";

export default async function Orcamento({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireUser();
  const { id } = await params;
  const b = await db.budget.findUnique({
    where: { id },
    include: {
      patient: true, professional: true,
      items: { include: { professional: true, appointments: { where: { status: "ATENDIDO" }, select: { id: true } } } },
      receivables: { include: { payments: true }, orderBy: { dueDate: "asc" } },
    },
  });
  if (!b) notFound();
  const t = budgetTotals(b);
  const st = BUDGET_STATUS[b.status];
  const recs = b.receivables.map((r) => ({ ...r, paid: round2(r.payments.reduce((x, p) => x + p.amount, 0)) }));
  const totalPaid = round2(recs.reduce((x, r) => x + r.paid, 0));
  const pending = round2(recs.filter((r) => !r.canceled && !r.settledAt).reduce((x, r) => x + Math.max(0, r.amount - r.paid), 0));
  const wa = whatsappLink(b.patient.phone, `Olá, ${b.patient.name.split(" ")[0]}! Segue o seu orçamento nº ${b.number} no valor de ${fmtMoney(t.total)}. Qualquer dúvida estou à disposição! 💖`);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="card flex flex-wrap items-center gap-3 p-5">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-stone-500">Orçamento nº {b.number} · {fmtDate(b.createdAt)}{b.validUntil && ` · válido até ${fmtDate(b.validUntil)}`}</p>
          <h1 className="text-xl font-semibold"><Link href={`/pacientes/${b.patientId}?aba=financeiro`} className="hover:text-brand-700">{b.patient.name}</Link></h1>
          <p className="text-sm text-stone-500">Responsável: {b.professional.name}</p>
        </div>
        <span className={`badge ${st.cls}`}>{st.label}</span>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/pdf/orcamento/${b.id}`} target="_blank" className="btn-secondary">PDF</a>
          {wa && <a href={wa} target="_blank" className="btn bg-emerald-600 text-white hover:bg-emerald-700"><Icon name="whatsapp" className="h-4 w-4" /> Enviar</a>}
          {b.status === "ABERTO" && <Link href={`/orcamentos/${b.id}/editar`} className="btn-secondary">Editar</Link>}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-stone-200 text-left text-xs text-stone-500">
            <tr><th className="p-3">Procedimento</th><th className="p-3">Profissional</th><th className="p-3 text-center">Sessões{b.status === "APROVADO" && " (feitas)"}</th><th className="p-3 text-right">Valor unit.</th><th className="p-3 text-right">Total</th></tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {b.items.map((i) => (
              <tr key={i.id}>
                <td className="p-3 font-medium">{i.description}</td>
                <td className="p-3">{(i.professional ?? b.professional).name}</td>
                <td className="p-3 text-center">
                  {b.status === "APROVADO" ? (
                    <span className={i.appointments.length >= i.quantity ? "text-emerald-700" : ""}>{i.appointments.length} / {i.quantity}</span>
                  ) : i.quantity}
                </td>
                <td className="p-3 text-right">{fmtMoney(i.unitPrice)}</td>
                <td className="p-3 text-right">{fmtMoney(i.unitPrice * i.quantity)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="text-right">
            <tr><td colSpan={4} className="p-2 pt-4">Subtotal</td><td className="p-2 pt-4">{fmtMoney(t.gross)}</td></tr>
            {t.discount > 0 && <tr><td colSpan={4} className="p-2">Desconto</td><td className="p-2 text-red-600">− {fmtMoney(t.discount)}</td></tr>}
            <tr className="text-base font-semibold"><td colSpan={4} className="p-3">Total</td><td className="p-3">{fmtMoney(t.total)}</td></tr>
          </tfoot>
        </table>
        {b.notes && <p className="border-t border-stone-100 p-4 text-sm text-stone-600">{b.notes}</p>}
      </div>

      {b.status === "ABERTO" && (
        <div className="flex flex-wrap items-start gap-2">
          <ApproveForm id={b.id} total={t.total} />
          <form action={setBudgetStatus.bind(null, b.id, "RECUSADO")}><button className="btn-secondary">Cliente recusou</button></form>
          {s.role === "ADMIN" && <form action={deleteBudget.bind(null, b.id)}><button className="btn-secondary text-red-600">Excluir</button></form>}
        </div>
      )}
      {b.status === "RECUSADO" && (
        <form action={setBudgetStatus.bind(null, b.id, "ABERTO")}><button className="btn-secondary">Reabrir orçamento</button></form>
      )}

      {recs.length > 0 && (
        <div className="card">
          <div className="flex flex-wrap items-center gap-4 border-b border-stone-100 p-4">
            <h2 className="mr-auto font-semibold">Parcelas</h2>
            <span className="text-sm">Pago: <b className="text-emerald-700">{fmtMoney(totalPaid)}</b></span>
            <span className="text-sm">A receber: <b className="text-amber-700">{fmtMoney(pending)}</b></span>
          </div>
          <div className="divide-y divide-stone-100">
            {recs.map((r) => {
              const rs = receivableStatus(r);
              return (
                <div key={r.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
                  <span className="w-16 font-medium">{r.installment}</span>
                  <span className="w-24">{fmtDate(r.dueDate)}</span>
                  <span className="flex-1">{fmtMoney(r.amount)}{r.paid > 0 && r.paid < r.amount && <span className="text-stone-500"> (pago {fmtMoney(r.paid)})</span>}</span>
                  <span className={`badge ${rs.cls}`}>{rs.label}</span>
                  {["ABERTA", "VENCIDA", "PARCIAL"].includes(rs.key) && (
                    <Link href={`/pagamentos/novo?parcela=${r.id}`} className="btn-primary btn-sm">Receber</Link>
                  )}
                  {r.payments.map((p) => (
                    <a key={p.id} href={`/api/pdf/recibo/${p.id}`} target="_blank" className="text-xs text-brand-700 underline">Recibo nº {p.number}</a>
                  ))}
                </div>
              );
            })}
          </div>
          {b.status === "APROVADO" && (
            <form action={setBudgetStatus.bind(null, b.id, "CANCELADO")} className="border-t border-stone-100 p-4">
              <button className="text-xs text-stone-500 underline hover:text-red-600">Cancelar plano (parcelas não pagas serão canceladas)</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
