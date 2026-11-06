"use client";
import { useState } from "react";
import { useFormAction } from "@/lib/useFormAction";
import { PAYMENT_METHODS, addMonths, fmtDate, fmtMoney, localToDate, moneyInput, parseMoney, round2, todayKey } from "@/lib/utils";
import { approveBudget } from "../actions";

export function ApproveForm({ id, total }: { id: string; total: number }) {
  const [state, action, pending] = useFormAction(approveBudget);
  const [open, setOpen] = useState(false);
  const [down, setDown] = useState("");
  const [n, setN] = useState(1);
  const [first, setFirst] = useState(addMonths(todayKey(), 1));
  const rest = round2(total - parseMoney(down));
  const each = n > 0 ? rest / n : 0;

  if (!open) return <button className="btn-primary" onClick={() => setOpen(true)}>Aprovar e gerar parcelas</button>;
  if (state?.ok) return null;

  return (
    <form onSubmit={action} className="card w-full space-y-4 border-emerald-300 p-5">
      <input type="hidden" name="id" value={id} />
      <h3 className="font-semibold">Forma de pagamento — total {fmtMoney(total)}</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">Entrada (R$)</label>
          <input name="downPayment" className="input" inputMode="decimal" placeholder="0,00" value={down} onChange={(e) => setDown(e.target.value)} />
        </div>
        <div>
          <label className="label">Forma da entrada</label>
          <select name="downMethod" className="input">{Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" name="downPaidNow" value="1" defaultChecked /> Entrada recebida agora
        </label>
        <div>
          <label className="label">Restante em quantas parcelas?</label>
          <select name="installments" className="input" value={n} onChange={(e) => setN(Number(e.target.value))}>
            {Array.from({ length: 24 }, (_, i) => i + 1).map((i) => <option key={i} value={i}>{i}x</option>)}
          </select>
        </div>
        <div>
          <label className="label">1º vencimento</label>
          <input type="date" name="firstDue" className="input" value={first} onChange={(e) => setFirst(e.target.value)} />
        </div>
        <div className="flex items-end pb-2 text-sm text-stone-600">
          <span>Ex.: valor à vista? Coloque o total na entrada.</span>
        </div>
      </div>
      {rest > 0 && (
        <p className="rounded-lg bg-stone-50 p-3 text-sm">
          Restante <b>{fmtMoney(rest)}</b> em <b>{n}x de {fmtMoney(each)}</b>
          {first && <> — de {fmtDate(localToDate(first, "12:00"))} a {fmtDate(localToDate(addMonths(first, n - 1), "12:00"))}</>}
        </p>
      )}
      {rest < 0 && <p className="text-sm text-red-600">A entrada é maior que o total ({moneyInput(total)}).</p>}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Voltar</button>
        <button className="btn-primary" disabled={pending || rest < 0}>{pending ? "Gerando..." : "Confirmar aprovação"}</button>
      </div>
    </form>
  );
}
