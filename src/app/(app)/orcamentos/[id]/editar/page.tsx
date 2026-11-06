import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formOptions } from "@/lib/options";
import { dateKey } from "@/lib/utils";
import { BudgetForm } from "../../BudgetForm";

export default async function EditarOrcamento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await db.budget.findUnique({ where: { id }, include: { items: true } });
  if (!b) notFound();
  if (b.status !== "ABERTO") redirect(`/orcamentos/${id}`);
  const opts = await formOptions();
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="page-title">Editar orçamento nº {b.number}</h1>
      <BudgetForm {...opts} initial={{ ...b, validUntil: b.validUntil ? dateKey(b.validUntil) : null }} />
    </div>
  );
}
