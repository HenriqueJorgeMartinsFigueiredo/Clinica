"use client";
import { useFormAction } from "@/lib/useFormAction";
import Link from "next/link";
import { savePatient } from "@/app/(app)/pacientes/actions";

type P = {
  id?: string; name?: string; cpf?: string | null; phone?: string | null; email?: string | null;
  birthDate?: string | null; gender?: string | null; address?: string | null; occupation?: string | null;
  origin?: string | null; notes?: string | null;
};

export function PatientForm({ patient = {} }: { patient?: P }) {
  const [state, action, pending] = useFormAction(savePatient);
  return (
    <form onSubmit={action} className="card space-y-4 p-5">
      {patient.id && <input type="hidden" name="id" value={patient.id} />}
      <div className="grid gap-4 md:grid-cols-2">
        <F label="Nome completo *" className="md:col-span-2"><input name="name" required className="input" defaultValue={patient.name} /></F>
        <F label="Celular / WhatsApp"><input name="phone" type="tel" className="input" defaultValue={patient.phone ?? ""} placeholder="(11) 99999-9999" /></F>
        <F label="E-mail"><input name="email" type="email" className="input" defaultValue={patient.email ?? ""} /></F>
        <F label="CPF"><input name="cpf" className="input" defaultValue={patient.cpf ?? ""} /></F>
        <F label="Data de nascimento"><input name="birthDate" type="date" className="input" defaultValue={patient.birthDate ?? ""} /></F>
        <F label="Sexo">
          <select name="gender" className="input" defaultValue={patient.gender ?? ""}>
            <option value="">—</option><option>Feminino</option><option>Masculino</option><option>Outro</option>
          </select>
        </F>
        <F label="Profissão"><input name="occupation" className="input" defaultValue={patient.occupation ?? ""} /></F>
        <F label="Endereço" className="md:col-span-2"><input name="address" className="input" defaultValue={patient.address ?? ""} /></F>
        <F label="Como conheceu a clínica?">
          <select name="origin" className="input" defaultValue={patient.origin ?? ""}>
            <option value="">—</option><option>Instagram</option><option>Indicação</option><option>Google</option>
            <option>Facebook</option><option>TikTok</option><option>Passou em frente</option><option>Outro</option>
          </select>
        </F>
        <F label="Observações" className="md:col-span-2"><textarea name="notes" rows={3} className="input" defaultValue={patient.notes ?? ""} /></F>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <Link href={patient.id ? `/pacientes/${patient.id}` : "/pacientes"} className="btn-secondary">Cancelar</Link>
        <button className="btn-primary" disabled={pending}>{pending ? "Salvando..." : "Salvar"}</button>
      </div>
    </form>
  );
}

function F({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={className}><label className="label">{label}</label>{children}</div>;
}
