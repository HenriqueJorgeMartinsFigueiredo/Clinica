import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { dateKey } from "@/lib/utils";
import { PatientForm } from "@/components/PatientForm";

export default async function EditarPaciente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await db.patient.findUnique({ where: { id } });
  if (!p) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="page-title">Editar cliente</h1>
      <PatientForm patient={{ ...p, birthDate: p.birthDate ? dateKey(p.birthDate) : null }} />
    </div>
  );
}
