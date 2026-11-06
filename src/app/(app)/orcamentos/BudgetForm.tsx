"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useFormAction } from "@/lib/useFormAction";
import { fmtMoney, moneyInput, parseMoney, round2 } from "@/lib/utils";
import { Icon } from "@/components/Icon";
import { saveBudget } from "./actions";

type Proc = { id: string; name: string; price: number; sessions: number; supplyCost: number };
type Opt = { id: string; name: string };
type Item = { key: number; procedureId: string | null; professionalId: string | null; description: string; unitPrice: string; supplyCost: string; quantity: number };

export function BudgetForm(props: {
  patients: Opt[]; professionals: Opt[]; procedures: Proc[];
  initial?: {
    id: string; patientId: string; professionalId: string; discount: number; notes: string | null; validUntil: string | null;
    items: { procedureId: string | null; professionalId: string | null; description: string; unitPrice: number; supplyCost: number; quantity: number }[];
  };
  defaultPatientId?: string; defaultProfessionalId?: string;
}) {
  const { initial, procedures, professionals } = props;
  const [state, action, pending] = useFormAction(saveBudget);
  const [items, setItems] = useState<Item[]>(
    initial?.items.map((i, k) => ({ ...i, key: k, unitPrice: moneyInput(i.unitPrice), supplyCost: moneyInput(i.supplyCost) })) ?? [],
  );
  const [discount, setDiscount] = useState(initial ? moneyInput(initial.discount) : "");
  const [discountPct, setDiscountPct] = useState("");

  const gross = useMemo(() => round2(items.reduce((s, i) => s + parseMoney(i.unitPrice) * i.quantity, 0)), [items]);
  const total = round2(gross - parseMoney(discount));

  const add = (procId: string) => {
    const p = procedures.find((x) => x.id === procId);
    setItems((it) => [
      ...it,
      { key: Date.now(), procedureId: p?.id ?? null, professionalId: null, description: p?.name ?? "", unitPrice: p ? moneyInput(p.price) : "", supplyCost: p ? moneyInput(p.supplyCost) : "", quantity: p?.sessions ?? 1 },
    ]);
  };
  const upd = (key: number, patch: Partial<Item>) => setItems((it) => it.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const payload = JSON.stringify(
    items.map((i) => ({ procedureId: i.procedureId, professionalId: i.professionalId || null, description: i.description, unitPrice: parseMoney(i.unitPrice), supplyCost: parseMoney(i.supplyCost), quantity: i.quantity })),
  );

  return (
    <form onSubmit={action} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="items" value={payload} />
      <div className="card grid gap-4 p-5 md:grid-cols-3">
        <div>
          <label className="label">Cliente</label>
          <select name="patientId" required className="input" defaultValue={initial?.patientId ?? props.defaultPatientId ?? ""}>
            <option value="">Selecione...</option>
            {props.patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Profissional responsável</label>
          <select name="professionalId" required className="input" defaultValue={initial?.professionalId ?? props.defaultProfessionalId ?? ""}>
            <option value="">Selecione...</option>
            {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Válido até</label>
          <input type="date" name="validUntil" className="input" defaultValue={initial?.validUntil ?? ""} />
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto font-semibold">Procedimentos</h2>
          <select className="input w-auto" value="" onChange={(e) => { if (e.target.value) add(e.target.value === "_livre" ? "" : e.target.value); }}>
            <option value="">+ Adicionar procedimento...</option>
            {procedures.map((p) => <option key={p.id} value={p.id}>{p.name} — {fmtMoney(p.price)}</option>)}
            <option value="_livre">Item livre (digitar)</option>
          </select>
        </div>
        {items.length === 0 && <p className="py-6 text-center text-sm text-stone-500">Nenhum procedimento adicionado.</p>}
        <div className="space-y-3">
          {items.map((i) => (
            <div key={i.key} className="grid grid-cols-2 gap-2 rounded-lg border border-stone-200 p-3 md:grid-cols-12 md:items-end">
              <div className="col-span-2 md:col-span-3">
                <label className="label">Descrição</label>
                <input className="input" value={i.description} onChange={(e) => upd(i.key, { description: e.target.value })} required />
              </div>
              <div className="col-span-2 md:col-span-2">
                <label className="label">Quem executa</label>
                <select className="input" value={i.professionalId ?? ""} onChange={(e) => upd(i.key, { professionalId: e.target.value || null })}>
                  <option value="">A responsável</option>
                  {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="label">Valor por sessão</label>
                <input className="input" inputMode="decimal" value={i.unitPrice} onChange={(e) => upd(i.key, { unitPrice: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="label" title="Não aparece para a cliente; é descontado da comissão">Insumos/sessão 🔒</label>
                <input className="input" inputMode="decimal" placeholder="0,00" value={i.supplyCost} onChange={(e) => upd(i.key, { supplyCost: e.target.value })} />
              </div>
              <div className="md:col-span-1">
                <label className="label">Sessões</label>
                <input type="number" min={1} className="input" value={i.quantity} onChange={(e) => upd(i.key, { quantity: Math.max(1, Number(e.target.value)) })} />
              </div>
              <div className="col-span-2 flex items-center justify-between gap-2 md:col-span-2 md:justify-end">
                <span className="text-sm font-medium">{fmtMoney(parseMoney(i.unitPrice) * i.quantity)}</span>
                <button type="button" className="text-stone-400 hover:text-red-600" onClick={() => setItems((it) => it.filter((x) => x.key !== i.key))} aria-label="Remover">
                  <Icon name="x" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 ml-auto max-w-sm space-y-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{fmtMoney(gross)}</span></div>
          <div className="flex items-center justify-between gap-2">
            <span>Desconto</span>
            <div className="flex items-center gap-1">
              <input className="input w-16 py-1" placeholder="%" inputMode="decimal" value={discountPct}
                onChange={(e) => { setDiscountPct(e.target.value); setDiscount(moneyInput(round2((gross * parseMoney(e.target.value)) / 100))); }} />
              <span className="text-stone-400">%</span>
              <input name="discount" className="input w-28 py-1 text-right" inputMode="decimal" placeholder="0,00" value={discount}
                onChange={(e) => { setDiscount(e.target.value); setDiscountPct(""); }} />
            </div>
          </div>
          <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-semibold"><span>Total</span><span>{fmtMoney(total)}</span></div>
        </div>
      </div>

      <div className="card p-5">
        <label className="label">Observações (aparecem no PDF)</label>
        <textarea name="notes" rows={3} className="input" defaultValue={initial?.notes ?? ""} placeholder="Ex.: intervalo de 15 dias entre as sessões." />
      </div>

      {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <Link href={initial ? `/orcamentos/${initial.id}` : "/orcamentos"} className="btn-secondary">Cancelar</Link>
        <button className="btn-primary" disabled={pending || items.length === 0}>{pending ? "Salvando..." : "Salvar orçamento"}</button>
      </div>
    </form>
  );
}
