import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { budgetTotals } from "@/lib/finance";
import { BUDGET_STATUS, fmtDate, fmtMoney } from "@/lib/utils";
import { Icon } from "@/components/Icon";

export default async function Orcamentos({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireUser();
  const { status } = await searchParams;
  const budgets = await db.budget.findMany({
    where: status ? { status } : {},
    include: { patient: true, professional: true, items: true },
    orderBy: { number: "desc" },
    take: 200,
  });
  const open = budgets.filter((b) => b.status === "ABERTO");
  const openTotal = open.reduce((s, b) => s + budgetTotals(b).total, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="page-title mr-auto">Orçamentos e planos</h1>
        <Link href="/orcamentos/novo" className="btn-primary"><Icon name="plus" className="h-4 w-4" /> Novo orçamento</Link>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/orcamentos" className={`badge px-3 py-1 ${!status ? "border-brand-400 bg-brand-50 text-brand-700" : "border-stone-200 bg-white"}`}>Todos</Link>
        {Object.entries(BUDGET_STATUS).map(([k, v]) => (
          <Link key={k} href={`?status=${k}`} className={`badge px-3 py-1 ${status === k ? "border-brand-400 bg-brand-50 text-brand-700" : "border-stone-200 bg-white"}`}>{v.label}</Link>
        ))}
      </div>
      {(!status || status === "ABERTO") && open.length > 0 && (
        <p className="text-sm text-stone-600">
          💡 {open.length} orçamento(s) em aberto somando <b>{fmtMoney(openTotal)}</b>. Vale um contato para fechar!
        </p>
      )}
      <div className="card divide-y divide-stone-100">
        {budgets.length === 0 && <p className="p-6 text-center text-sm text-stone-500">Nenhum orçamento.</p>}
        {budgets.map((b) => (
          <Link key={b.id} href={`/orcamentos/${b.id}`} className="flex flex-wrap items-center gap-3 p-4 hover:bg-stone-50">
            <span className="w-12 text-sm text-stone-400">nº {b.number}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{b.patient.name}</p>
              <p className="truncate text-xs text-stone-500">{b.items.map((i) => i.description).join(", ")} · {b.professional.name} · {fmtDate(b.createdAt)}</p>
            </div>
            <span className="font-medium">{fmtMoney(budgetTotals(b).total)}</span>
            <span className={`badge ${BUDGET_STATUS[b.status].cls}`}>{BUDGET_STATUS[b.status].label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
