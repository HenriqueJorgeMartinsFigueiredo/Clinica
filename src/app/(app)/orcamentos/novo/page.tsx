import { requireUser } from "@/lib/auth";
import { formOptions } from "@/lib/options";
import { BudgetForm } from "../BudgetForm";

export default async function NovoOrcamento({ searchParams }: { searchParams: Promise<{ paciente?: string }> }) {
  const s = await requireUser();
  const { paciente } = await searchParams;
  const opts = await formOptions();
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="page-title">Novo orçamento</h1>
      <BudgetForm {...opts} defaultPatientId={paciente} defaultProfessionalId={s.role !== "RECEPCAO" ? s.userId : undefined} />
    </div>
  );
}
