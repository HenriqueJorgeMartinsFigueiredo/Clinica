"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { logout } from "@/app/login/actions";

type Item = { href: string; label: string; icon: string; roles?: string[] };
const items: Item[] = [
  { href: "/", label: "Início", icon: "home" },
  { href: "/agenda", label: "Agenda", icon: "calendar" },
  { href: "/pacientes", label: "Clientes", icon: "users" },
  { href: "/financeiro", label: "Financeiro", icon: "money", roles: ["ADMIN", "RECEPCAO"] },
  { href: "/financeiro/comissoes", label: "Comissões", icon: "money", roles: ["PROFISSIONAL"] },
  { href: "/orcamentos", label: "Orçamentos", icon: "doc" },
  { href: "/procedimentos", label: "Procedimentos", icon: "sparkles" },
  { href: "/equipe", label: "Equipe", icon: "team", roles: ["ADMIN"] },
  { href: "/configuracoes", label: "Configurações", icon: "settings", roles: ["ADMIN"] },
];

export function Nav({ name, role }: { name: string; role: string }) {
  const path = usePathname();
  const [more, setMore] = useState(false);
  const visible = items.filter((i) => !i.roles || i.roles.includes(role));
  const active = (href: string) =>
    href === "/" ? path === "/" : href === "/financeiro" ? path.startsWith("/financeiro") || path.startsWith("/pagamentos") : path.startsWith(href);
  const primary = visible.slice(0, 4);
  const rest = visible.slice(4);

  return (
    <>
      {/* Computador: barra lateral */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-stone-200 bg-white md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <img src="/icon.svg" alt="" className="h-8 w-8" />
          <span className="font-semibold text-stone-900">Clínica</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {visible.map((i) => (
            <Link key={i.href} href={i.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${active(i.href) ? "bg-brand-50 font-medium text-brand-700" : "text-stone-600 hover:bg-stone-100"}`}>
              <Icon name={i.icon} /> {i.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-stone-200 p-4">
          <p className="truncate text-sm font-medium">{name}</p>
          <form action={logout}>
            <button className="mt-2 flex items-center gap-2 text-xs text-stone-500 hover:text-brand-700">
              <Icon name="logout" className="h-4 w-4" /> Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Celular */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <img src="/icon.svg" alt="" className="h-7 w-7" />
          <span className="font-semibold">Clínica</span>
        </div>
        <span className="truncate text-xs text-stone-500">{name}</span>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {primary.map((i) => (
          <Link key={i.href} href={i.href} onClick={() => setMore(false)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${active(i.href) ? "text-brand-700" : "text-stone-500"}`}>
            <Icon name={i.icon} className="h-5 w-5" />
            {i.label}
          </Link>
        ))}
        <button onClick={() => setMore((m) => !m)}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${more || rest.some((i) => active(i.href)) ? "text-brand-700" : "text-stone-500"}`}>
          <Icon name="menu" className="h-5 w-5" /> Mais
        </button>
      </nav>
      {more && (
        <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setMore(false)}>
          <div className="absolute inset-x-0 bottom-14 rounded-t-2xl bg-white p-3 pb-[calc(env(safe-area-inset-bottom)+12px)]" onClick={(e) => e.stopPropagation()}>
            {rest.map((i) => (
              <Link key={i.href} href={i.href} onClick={() => setMore(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm ${active(i.href) ? "bg-brand-50 text-brand-700" : "text-stone-700"}`}>
                <Icon name={i.icon} /> {i.label}
              </Link>
            ))}
            <form action={logout}>
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-stone-500"><Icon name="logout" /> Sair</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
