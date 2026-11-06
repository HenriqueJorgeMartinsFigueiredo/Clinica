"use client";
import { useFormAction } from "@/lib/useFormAction";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { saveUser } from "./actions";
import { ROLES } from "@/lib/utils";

type U = { id: string; name: string; email: string; role: string; specialty: string | null; color: string; active: boolean; commissionPct: number };

export function UserForm({ user }: { user?: U }) {
  const [state, action, pending] = useFormAction(saveUser);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok && !user) ref.current?.reset(); }, [state, user]);
  return (
    <form ref={ref} onSubmit={action} className="card grid gap-3 p-4 sm:grid-cols-6">
      {user && <input type="hidden" name="id" value={user.id} />}
      <div className="sm:col-span-2"><label className="label">Nome</label><input name="name" required className="input" defaultValue={user?.name} /></div>
      <div className="sm:col-span-2"><label className="label">E-mail (login)</label><input name="email" type="email" required className="input" defaultValue={user?.email} /></div>
      <div className="sm:col-span-2"><label className="label">{user ? "Nova senha (deixe vazio p/ manter)" : "Senha"}</label><input name="password" type="password" minLength={8} className="input" autoComplete="new-password" /></div>
      <div className="sm:col-span-2"><label className="label">Perfil</label>
        <select name="role" className="input" defaultValue={user?.role ?? "PROFISSIONAL"}>
          {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div><label className="label">Especialidade</label><input name="specialty" className="input" placeholder="Ex.: Biomédica esteta" defaultValue={user?.specialty ?? ""} /></div>
      <div><label className="label">Cor na agenda</label><input name="color" type="color" className="input h-10 p-1" defaultValue={user?.color ?? "#a855f7"} /></div>
      <div><label className="label">Comissão (%)</label><input name="commissionPct" className="input" inputMode="decimal" defaultValue={user ? String(user.commissionPct).replace(".", ",") : "0"} /></div>
      <div><label className="label">Situação</label>
        <select name="active" className="input" defaultValue={user?.active === false ? "0" : "1"}><option value="1">Ativo</option><option value="0">Inativo</option></select>
      </div>
      {state?.error && <p className="text-sm text-red-600 sm:col-span-6">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-700 sm:col-span-6">Salvo!</p>}
      <div className="flex justify-end gap-2 sm:col-span-6">
        {user && <Link href="/equipe" className="btn-secondary">Cancelar</Link>}
        <button className="btn-primary" disabled={pending}>{user ? "Salvar alterações" : "Adicionar pessoa"}</button>
      </div>
    </form>
  );
}
