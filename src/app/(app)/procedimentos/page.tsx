import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmtMoney } from "@/lib/utils";
import { saveProcedure } from "./actions";

export default async function Procedimentos({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  const s = await requireUser();
  const { editar } = await searchParams;
  const isAdmin = s.role === "ADMIN";
  const list = await db.procedure.findMany({ orderBy: [{ active: "desc" }, { category: "asc" }, { name: "asc" }] });
  const editing = editar ? list.find((p) => p.id === editar) : undefined;

  return (
    <div className="space-y-4">
      <h1 className="page-title">Procedimentos</h1>

      {isAdmin && (
        <form action={saveProcedure} key={editing?.id ?? "novo"} className="card grid gap-3 p-4 sm:grid-cols-6">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <div className="sm:col-span-2"><label className="label">Nome</label><input name="name" required className="input" defaultValue={editing?.name} /></div>
          <div><label className="label">Categoria</label><input name="category" className="input" list="cats" defaultValue={editing?.category ?? ""} /></div>
          <div><label className="label">Duração (min)</label><input name="durationMin" type="number" min={5} step={5} className="input" defaultValue={editing?.durationMin ?? 60} /></div>
          <div><label className="label">Valor (R$)</label><input name="price" className="input" inputMode="decimal" defaultValue={editing ? String(editing.price).replace(".", ",") : ""} /></div>
          <div><label className="label">Sessões</label><input name="sessions" type="number" min={1} className="input" defaultValue={editing?.sessions ?? 1} /></div>
          <div className="sm:col-span-4"><label className="label">Descrição</label><input name="description" className="input" defaultValue={editing?.description ?? ""} /></div>
          <div><label className="label">Situação</label>
            <select name="active" className="input" defaultValue={editing?.active === false ? "0" : "1"}><option value="1">Ativo</option><option value="0">Inativo</option></select>
          </div>
          <div className="flex items-end gap-2">
            <button className="btn-primary w-full">{editing ? "Salvar" : "Adicionar"}</button>
            {editing && <Link href="/procedimentos" className="btn-secondary">×</Link>}
          </div>
          <datalist id="cats">{[...new Set(list.map((p) => p.category).filter(Boolean))].map((c) => <option key={c!} value={c!} />)}</datalist>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-stone-200 text-left text-xs text-stone-500">
            <tr><th className="p-3">Procedimento</th><th className="p-3">Categoria</th><th className="p-3">Duração</th><th className="p-3">Sessões</th><th className="p-3 text-right">Valor</th>{isAdmin && <th />}</tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {list.map((p) => (
              <tr key={p.id} className={p.active ? "" : "text-stone-400"}>
                <td className="p-3 font-medium">{p.name}{!p.active && " (inativo)"}</td>
                <td className="p-3">{p.category}</td>
                <td className="p-3">{p.durationMin} min</td>
                <td className="p-3">{p.sessions}</td>
                <td className="p-3 text-right">{fmtMoney(p.price)}</td>
                {isAdmin && <td className="p-3 text-right"><Link href={`?editar=${p.id}`} className="text-brand-700 hover:underline">Editar</Link></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
