import Link from "next/link";
import { Icon } from "./Icon";
import { addMonths, capFirst, fmtDate, localToDate } from "@/lib/utils";

/** Navegação por mês: ?mes=2026-11 (mantém outros parâmetros) */
export function MonthNav({ ym, extra = "" }: { ym: string; extra?: string }) {
  const prev = addMonths(`${ym}-01`, -1).slice(0, 7);
  const next = addMonths(`${ym}-01`, 1).slice(0, 7);
  return (
    <div className="flex items-center gap-2">
      <Link href={`?mes=${prev}${extra}`} className="btn-secondary btn-sm" aria-label="Mês anterior"><Icon name="left" className="h-4 w-4" /></Link>
      <span className="min-w-36 text-center text-sm font-medium">{capFirst(fmtDate(localToDate(`${ym}-15`, "12:00"), { month: "long", year: "numeric" }))}</span>
      <Link href={`?mes=${next}${extra}`} className="btn-secondary btn-sm" aria-label="Próximo mês"><Icon name="right" className="h-4 w-4" /></Link>
    </div>
  );
}
