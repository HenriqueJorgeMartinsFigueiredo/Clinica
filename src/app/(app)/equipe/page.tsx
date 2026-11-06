import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ROLES } from "@/lib/utils";
import { UserForm } from "./UserForm";

export default async function Equipe({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  await requireUser(["ADMIN"]);
  const { editar } = await searchParams;
  const users = await db.user.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  const editing = editar ? users.find((u) => u.id === editar) : undefined;

  return (
    <div className="space-y-4">
      <h1 className="page-title">Equipe e acessos</h1>
      <p className="text-sm text-stone-500">
        <b>Administrador(a)</b> vê e configura tudo · <b>Profissional</b> atende e aparece na agenda · <b>Recepção</b> agenda e cadastra clientes.
      </p>
      <UserForm key={editing?.id ?? "novo"} user={editing} />
      <div className="card divide-y divide-stone-100">
        {users.map((u) => (
          <div key={u.id} className={`flex items-center gap-3 p-4 ${u.active ? "" : "opacity-50"}`}>
            <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: u.color }} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{u.name} {!u.active && "(inativo)"}</p>
              <p className="truncate text-xs text-stone-500">{u.email} · {ROLES[u.role]}{u.specialty ? ` · ${u.specialty}` : ""}</p>
            </div>
            <Link href={`?editar=${u.id}`} className="text-sm text-brand-700 hover:underline">Editar</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
