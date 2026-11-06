"use client";
import { useFormAction } from "@/lib/useFormAction";
import { login } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useFormAction(login);
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-stone-100 p-4">
      <form onSubmit={action} className="card w-full max-w-sm space-y-4 p-8">
        <div className="text-center">
          <img src="/icon.svg" alt="" className="mx-auto mb-3 h-12 w-12" />
          <h1 className="text-xl font-semibold">Entrar no sistema</h1>
          <p className="text-sm text-stone-500">Gestão da clínica</p>
        </div>
        <div>
          <label className="label">E-mail</label>
          <input name="email" type="email" required className="input" autoComplete="username" />
        </div>
        <div>
          <label className="label">Senha</label>
          <input name="password" type="password" required className="input" autoComplete="current-password" />
        </div>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button className="btn-primary w-full" disabled={pending}>
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
