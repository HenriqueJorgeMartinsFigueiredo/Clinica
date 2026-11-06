"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function FinanceTabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-stone-200">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href}
          className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm ${path === t.href ? "border-brand-600 font-medium text-brand-700" : "border-transparent text-stone-500 hover:text-stone-800"}`}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}
