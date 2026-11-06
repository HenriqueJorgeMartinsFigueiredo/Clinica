import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formOptions } from "@/lib/options";
import { getSettings, parseFees } from "@/lib/finance";
import { round2 } from "@/lib/utils";
import { PaymentForm } from "./PaymentForm";

export default async function NovoPagamento({ searchParams }: { searchParams: Promise<{ paciente?: string; parcela?: string; agendamento?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  let patientId = sp.paciente;
  let preset: { professionalId?: string; procedureId?: string; amount?: number; description?: string } | undefined;

  if (sp.parcela) {
    const r = await db.receivable.findUnique({ where: { id: sp.parcela } });
    patientId = r?.patientId;
  }
  if (sp.agendamento) {
    const a = await db.appointment.findUnique({ where: { id: sp.agendamento }, include: { procedure: true } });
    if (a) {
      patientId = a.patientId;
      if (!a.budgetItemId) preset = { professionalId: a.professionalId, procedureId: a.procedureId ?? undefined, amount: a.procedure?.price, description: a.procedure?.name };
    }
  }

  const opts = await formOptions();
  const fees = parseFees((await getSettings()).methodFees);
  const recs = patientId
    ? await db.receivable.findMany({
        where: { patientId, canceled: false, settledAt: null },
        include: { payments: { select: { amount: true } } },
        orderBy: { dueDate: "asc" },
      })
    : [];
  const receivables = recs
    .map((r) => ({
      id: r.id,
      label: `${r.description}${r.installment ? ` (${r.installment})` : ""}`,
      dueDate: r.dueDate.toISOString(),
      open: round2(r.amount - r.payments.reduce((s, p) => s + p.amount, 0)),
    }))
    .filter((r) => r.open > 0.005);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="page-title">Receber pagamento</h1>
      <PaymentForm key={patientId ?? "x"} {...opts} patientId={patientId} receivables={receivables} receivableId={sp.parcela} preset={preset} fees={fees} />
    </div>
  );
}
