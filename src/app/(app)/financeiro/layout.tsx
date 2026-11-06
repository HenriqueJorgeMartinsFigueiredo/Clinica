import { requireUser } from "@/lib/auth";
import { FinanceTabs } from "./FinanceTabs";

const FIN_TABS = [
  { href: "/financeiro", label: "Caixa do dia", roles: ["ADMIN", "RECEPCAO"] },
  { href: "/financeiro/receber", label: "A receber", roles: ["ADMIN", "RECEPCAO"] },
  { href: "/financeiro/pagar", label: "A pagar", roles: ["ADMIN"] },
  { href: "/financeiro/fluxo", label: "Fluxo de caixa", roles: ["ADMIN"] },
  { href: "/financeiro/comissoes", label: "Comissões", roles: ["ADMIN", "PROFISSIONAL"] },
];

export default async function FinLayout({ children }: { children: React.ReactNode }) {
  const s = await requireUser();
  const tabs = FIN_TABS.filter((t) => t.roles.includes(s.role)).map(({ href, label }) => ({ href, label }));
  return (
    <div className="space-y-4">
      <h1 className="page-title">Financeiro</h1>
      <FinanceTabs tabs={tabs} />
      {children}
    </div>
  );
}
