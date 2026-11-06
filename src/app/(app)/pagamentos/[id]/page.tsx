import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PAYMENT_METHODS, fmtDate, fmtDateTime, fmtMoney, whatsappLink } from "@/lib/utils";
import { Icon } from "@/components/Icon";
import { deletePayment } from "../actions";

export default async function Pagamento({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  const s = await requireUser();
  const { id } = await params;
  const { erro } = await searchParams;
  const p = await db.payment.findUnique({
    where: { id },
    include: { patient: true, createdBy: true, receivable: { include: { budget: true } }, commissions: { include: { professional: true } } },
  });
  if (!p) notFound();
  const wa = whatsappLink(p.patient.phone, `Olá, ${p.patient.name.split(" ")[0]}! Confirmamos o recebimento de ${fmtMoney(p.amount)} referente a ${p.description ?? "atendimento"}. Obrigada! 💖`);
  const canSeeCommission = s.role === "ADMIN";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="card space-y-4 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div>
        <div>
          <p className="text-sm text-stone-500">Recibo nº {p.number}</p>
          <p className="text-3xl font-semibold">{fmtMoney(p.amount)}</p>
          <p className="text-sm text-stone-600">{PAYMENT_METHODS[p.method]} · {fmtDate(p.paidAt)}</p>
          {p.fee > 0 && (
            <p className="text-xs text-stone-500">Taxa da maquininha {fmtMoney(p.fee)} · líquido {fmtMoney(p.amount - p.fee)}</p>
          )}
        </div>
        <p className="text-sm">
          <Link href={`/pacientes/${p.patientId}?aba=financeiro`} className="font-medium hover:text-brand-700">{p.patient.name}</Link>
          {p.description && <> — {p.description}</>}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <a href={`/api/pdf/recibo/${p.id}`} target="_blank" className="btn-primary">Recibo em PDF</a>
          {wa && <a href={wa} target="_blank" className="btn bg-emerald-600 text-white hover:bg-emerald-700"><Icon name="whatsapp" className="h-4 w-4" /> Avisar cliente</a>}
          {p.receivable?.budget && <Link href={`/orcamentos/${p.receivable.budget.id}`} className="btn-secondary">Ver plano</Link>}
          <Link href="/pagamentos/novo" className="btn-secondary">Novo recebimento</Link>
        </div>
        <p className="text-xs text-stone-400">Registrado por {p.createdBy.name} em {fmtDateTime(p.createdAt)}</p>
      </div>

      {canSeeCommission && (
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">Comissões geradas por este pagamento</h2>
          {p.commissions.length === 0 ? (
            <p className="text-sm text-stone-500">Nenhuma comissão (profissional sem % de comissão configurado).</p>
          ) : (
            <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-sm">
              <thead className="text-right text-xs text-stone-500"><tr><th className="py-1 text-left">Profissional</th><th>Pago</th><th>Taxa</th><th>Insumos</th><th>Base</th><th>%</th><th>Comissão</th></tr></thead>
              <tbody>
                {p.commissions.map((c) => (
                  <tr key={c.id} className="border-t border-stone-100 text-right">
                    <td className="py-2 text-left">{c.professional.name}</td><td>{fmtMoney(c.gross)}</td>
                    <td className="text-stone-500">− {fmtMoney(c.fee)}</td><td className="text-stone-500">− {fmtMoney(c.supplies)}</td>
                    <td className="font-medium">{fmtMoney(c.base)}</td><td>{c.pct}%</td>
                    <td className="text-right font-medium">{fmtMoney(c.amount)} {c.payoutId && <span className="badge ml-1 border-emerald-300 bg-emerald-50 text-emerald-700">paga</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      )}

      {s.role === "ADMIN" && (
        <form action={deletePayment.bind(null, p.id)} className="text-center">
          {erro === "comissao-paga" && <p className="mb-2 text-sm text-red-600">Não é possível estornar: a comissão deste pagamento já foi paga.</p>}
          <button className="text-xs text-stone-500 underline hover:text-red-600">Estornar pagamento</button>
        </form>
      )}
    </div>
  );
}
