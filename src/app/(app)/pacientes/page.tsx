import Link from "next/link";
import { db } from "@/lib/db";
import { age, fmtDate } from "@/lib/utils";
import { Icon } from "@/components/Icon";

export default async function Pacientes({ searchParams }: { searchParams: Promise<{ q?: string; inativos?: string }> }) {
  const { q = "", inativos } = await searchParams;
  const digits = q.replace(/\D/g, "");
  const patients = await db.patient.findMany({
    where: {
      active: !inativos,
      ...(q ? { OR: [{ name: { contains: q } }, ...(digits ? [{ phone: { contains: digits } }, { cpf: { contains: digits } }] : []), { email: { contains: q } }] } : {}),
    },
    include: { appointments: { orderBy: { start: "desc" }, take: 1, select: { start: true } } },
    orderBy: { name: "asc" },
    take: 200,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="page-title mr-auto">Clientes</h1>
        <Link href="/pacientes/novo" className="btn-primary"><Icon name="plus" className="h-4 w-4" /> Nova cliente</Link>
      </div>
      <form className="flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1">
          <Icon name="search" className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <input name="q" defaultValue={q} placeholder="Buscar por nome, telefone, CPF ou e-mail" className="input pl-9" />
        </div>
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input type="checkbox" name="inativos" value="1" defaultChecked={!!inativos} /> Inativas
        </label>
        <button className="btn-secondary">Buscar</button>
      </form>

      <div className="card divide-y divide-stone-100">
        {patients.length === 0 && <p className="p-6 text-center text-sm text-stone-500">Nenhuma cliente encontrada.</p>}
        {patients.map((p) => (
          <Link key={p.id} href={`/pacientes/${p.id}`} className="flex items-center gap-3 p-4 hover:bg-stone-50">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">
              {p.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{p.name}</p>
              <p className="truncate text-xs text-stone-500">
                {[p.phone, age(p.birthDate) != null ? `${age(p.birthDate)} anos` : null].filter(Boolean).join(" · ") || "Sem telefone"}
              </p>
            </div>
            <p className="hidden text-xs text-stone-400 sm:block">
              {p.appointments[0] ? `Último agend.: ${fmtDate(p.appointments[0].start)}` : "Sem agendamentos"}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
