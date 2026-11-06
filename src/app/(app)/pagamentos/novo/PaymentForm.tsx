"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormAction } from "@/lib/useFormAction";
import { PAYMENT_METHODS, fmtDate, fmtMoney, moneyInput, parseMoney, round2, todayKey } from "@/lib/utils";
import { receivePayment } from "../actions";

type Rec = { id: string; label: string; dueDate: string; open: number };
type Opt = { id: string; name: string };
type Proc = Opt & { price: number; supplyCost: number };

export function PaymentForm(props: {
  patients: Opt[]; professionals: Opt[]; procedures: Proc[];
  patientId?: string; receivables: Rec[]; receivableId?: string;
  preset?: { professionalId?: string; procedureId?: string; amount?: number; description?: string };
  fees: Record<string, number>;
}) {
  const router = useRouter();
  const [state, action, pending] = useFormAction(receivePayment);
  const [mode, setMode] = useState<"parcela" | "avulso">(props.receivables.length && !props.preset ? "parcela" : "avulso");
  const [recId, setRecId] = useState(props.receivableId ?? props.receivables[0]?.id ?? "");
  const rec = props.receivables.find((r) => r.id === recId);
  const [amount, setAmount] = useState(
    props.preset?.amount != null ? moneyInput(props.preset.amount) : rec ? moneyInput(rec.open) : "",
  );
  const [method, setMethod] = useState("");
  const [feeEdited, setFeeEdited] = useState<string | null>(null);
  const autoFee = round2((parseMoney(amount) * (props.fees[method] ?? 0)) / 100);
  const fee = feeEdited ?? moneyInput(autoFee);
  const presetProc = props.procedures.find((p) => p.id === props.preset?.procedureId);
  const [supplies, setSupplies] = useState(presetProc?.supplyCost ? moneyInput(presetProc.supplyCost) : "");
  const net = round2(parseMoney(amount) - parseMoney(fee));
  const base = Math.max(0, round2(net - (mode === "avulso" ? parseMoney(supplies) : 0)));
  const short = mode === "parcela" && rec ? round2(rec.open - parseMoney(amount)) : 0;

  return (
    <form onSubmit={action} className="card space-y-4 p-5">
      <div>
        <label className="label">Cliente</label>
        <select name="patientId" className="input" value={props.patientId ?? ""} required
          onChange={(e) => router.push(`/pagamentos/novo?paciente=${e.target.value}`)}>
          <option value="">Selecione...</option>
          {props.patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {props.patientId && (
        <>
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode("parcela")} disabled={!props.receivables.length}
              className={`btn-sm btn flex-1 border ${mode === "parcela" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-stone-300"} disabled:opacity-40`}>
              Parcela de orçamento ({props.receivables.length})
            </button>
            <button type="button" onClick={() => setMode("avulso")}
              className={`btn-sm btn flex-1 border ${mode === "avulso" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-stone-300"}`}>
              Atendimento avulso
            </button>
          </div>

          {mode === "parcela" ? (
            <div>
              <label className="label">Parcela</label>
              <select name="receivableId" className="input" value={recId}
                onChange={(e) => { setRecId(e.target.value); const r = props.receivables.find((x) => x.id === e.target.value); if (r) setAmount(moneyInput(r.open)); }}>
                {props.receivables.map((r) => (
                  <option key={r.id} value={r.id}>{r.label} · vence {fmtDate(r.dueDate)} · saldo {fmtMoney(r.open)}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Procedimento</label>
                <select name="procedureId" className="input" defaultValue={props.preset?.procedureId ?? ""}
                  onChange={(e) => { const p = props.procedures.find((x) => x.id === e.target.value); if (p) { setAmount(moneyInput(p.price)); setSupplies(p.supplyCost ? moneyInput(p.supplyCost) : ""); } }}>
                  <option value="">—</option>
                  {props.procedures.map((p) => <option key={p.id} value={p.id}>{p.name} ({fmtMoney(p.price)})</option>)}
                </select>
              </div>
              <div>
                <label className="label">Profissional que atendeu</label>
                <select name="professionalId" className="input" required defaultValue={props.preset?.professionalId ?? ""}>
                  <option value="">Selecione...</option>
                  {props.professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Descrição (aparece no recibo)</label>
                <input name="description" className="input" defaultValue={props.preset?.description ?? ""} placeholder="Ex.: Limpeza de pele" />
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Valor recebido (R$)</label>
              <input name="amount" className="input text-lg font-semibold" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="label">Forma de pagamento</label>
              <select name="method" className="input" required value={method} onChange={(e) => { setMethod(e.target.value); setFeeEdited(null); }}>
                <option value="" disabled>Selecione...</option>
                {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}{props.fees[k] ? ` (taxa ${String(props.fees[k]).replace(".", ",")}%)` : ""}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Data do pagamento</label>
              <input type="date" name="paidAt" className="input" defaultValue={todayKey()} max={todayKey()} />
            </div>
          </div>

          {short > 0.005 && (
            <label className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <input type="checkbox" name="settle" value="1" className="mt-1" />
              <span>
                Faltam {fmtMoney(short)} nesta parcela. Marque para <b>quitar a parcela com desconto</b>. Se não marcar, o
                restante continua em aberto.
              </span>
            </label>
          )}
          <div className="grid items-end gap-3 rounded-lg bg-stone-50 p-3 sm:grid-cols-3">
            <div>
              <label className="label">Taxa da maquininha (R$)</label>
              <input name="fee" className="input" inputMode="decimal" value={fee} onChange={(e) => setFeeEdited(e.target.value)} />
            </div>
            {mode === "avulso" ? (
              <div>
                <label className="label">Insumos usados (R$)</label>
                <input name="supplies" className="input" inputMode="decimal" placeholder="0,00" value={supplies} onChange={(e) => setSupplies(e.target.value)} />
              </div>
            ) : <div className="hidden sm:block" />}
            <p className="text-sm">
              Base da comissão: <b>{mode === "avulso" ? fmtMoney(base) : `${fmtMoney(net)} − insumos`}</b>
              <span className="block text-xs text-stone-500">
                {mode === "avulso" ? "Valor pago − taxa − insumos." : "Os insumos do plano são descontados na proporção do que foi pago."}
              </span>
            </p>
          </div>

          <div>
            <label className="label">Observação</label>
            <input name="notes" className="input" />
          </div>
        </>
      )}

      {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      <div className="flex justify-end">
        <button className="btn-primary" disabled={pending || !props.patientId}>{pending ? "Registrando..." : "Registrar pagamento"}</button>
      </div>
    </form>
  );
}
