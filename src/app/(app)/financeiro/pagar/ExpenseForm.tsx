"use client";
import { useEffect, useRef, useState } from "react";
import { useFormAction } from "@/lib/useFormAction";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, todayKey } from "@/lib/utils";
import { saveExpense } from "../actions";

export function ExpenseForm() {
  const [state, action, pending] = useFormAction(saveExpense);
  const [open, setOpen] = useState(false);
  const [paidNow, setPaidNow] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) { ref.current?.reset(); setPaidNow(false); setOpen(false); } }, [state]);

  if (!open) return <button className="btn-primary btn-sm" onClick={() => setOpen(true)}>+ Nova conta a pagar</button>;
  return (
    <form ref={ref} onSubmit={action} className="card grid w-full gap-3 p-4 sm:grid-cols-6">
      <div className="sm:col-span-3"><label className="label">Descrição</label><input name="description" required className="input" placeholder="Ex.: Aluguel, Compra de ácido hialurônico" /></div>
      <div className="sm:col-span-2"><label className="label">Categoria</label>
        <select name="category" className="input">{EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
      </div>
      <div><label className="label">Valor (R$)</label><input name="amount" required className="input" inputMode="decimal" /></div>
      <div className="sm:col-span-2"><label className="label">Fornecedor</label><input name="supplier" className="input" /></div>
      <div><label className="label">Vencimento</label><input type="date" name="dueDate" className="input" defaultValue={todayKey()} /></div>
      <div><label className="label">Repetir (meses)</label><input type="number" name="repeat" min={1} max={60} defaultValue={1} className="input" /></div>
      <label className="flex items-end gap-2 pb-2 text-sm sm:col-span-1"><input type="checkbox" name="paidNow" value="1" checked={paidNow} onChange={(e) => setPaidNow(e.target.checked)} /> Já paga</label>
      {paidNow && (
        <div><label className="label">Pago com</label>
          <select name="method" className="input">{Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </div>
      )}
      {state?.error && <p className="text-sm text-red-600 sm:col-span-6">{state.error}</p>}
      <div className="flex justify-end gap-2 sm:col-span-6">
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancelar</button>
        <button className="btn-primary" disabled={pending}>Salvar</button>
      </div>
    </form>
  );
}
