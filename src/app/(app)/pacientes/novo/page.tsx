import { PatientForm } from "@/components/PatientForm";

export default function NovoPaciente() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="page-title">Nova cliente</h1>
      <PatientForm />
    </div>
  );
}
