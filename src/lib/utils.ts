// O Brasil não tem horário de verão desde 2019: fuso fixo -03:00.
export const TZ = "America/Sao_Paulo";
export const TZ_OFFSET = "-03:00";

export const ROLES: Record<string, string> = {
  ADMIN: "Administrador(a)",
  PROFISSIONAL: "Profissional",
  RECEPCAO: "Recepção",
};

export const STATUS: Record<string, { label: string; cls: string }> = {
  AGENDADO: { label: "Agendado", cls: "bg-sky-100 text-sky-800 border-sky-300" },
  CONFIRMADO: { label: "Confirmado", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  EM_ATENDIMENTO: { label: "Em atendimento", cls: "bg-amber-100 text-amber-800 border-amber-300" },
  ATENDIDO: { label: "Atendido", cls: "bg-violet-100 text-violet-800 border-violet-300" },
  FALTOU: { label: "Faltou", cls: "bg-red-100 text-red-800 border-red-300" },
  CANCELADO: { label: "Cancelado", cls: "bg-gray-100 text-gray-500 border-gray-300 line-through" },
};

/** "2026-11-06" + "14:30" (horário de Brasília) -> Date */
export function localToDate(date: string, time = "00:00") {
  return new Date(`${date}T${time}:00${TZ_OFFSET}`);
}

/** Date -> "2026-11-06" no fuso da clínica */
export function dateKey(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

/** Date -> "14:30" no fuso da clínica */
export function timeKey(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
}

export function fmtDate(d: Date | string | null | undefined, opts: Intl.DateTimeFormatOptions = {}) {
  if (!d) return "";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, ...opts }).format(new Date(d));
}

export function fmtDateTime(d: Date | string) {
  return fmtDate(d, { dateStyle: "short", timeStyle: "short" });
}

export function fmtMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function todayKey() {
  return dateKey(new Date());
}

export function addDays(key: string, n: number) {
  const d = localToDate(key, "12:00");
  d.setUTCDate(d.getUTCDate() + n);
  return dateKey(d);
}

export function age(birth: Date | null | undefined) {
  if (!birth) return null;
  const b = new Date(birth);
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
  return a;
}

export function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}

/** Link para abrir conversa no WhatsApp com mensagem pronta */
export function whatsappLink(phone: string | null | undefined, msg: string) {
  if (!phone) return null;
  let n = onlyDigits(phone);
  if (n.length <= 11) n = "55" + n;
  return `https://wa.me/${n}?text=${encodeURIComponent(msg)}`;
}

export function str(fd: FormData, k: string) {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

export function capFirst(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const PAYMENT_METHODS: Record<string, string> = {
  PIX: "Pix",
  DINHEIRO: "Dinheiro",
  CREDITO: "Cartão de crédito",
  CREDITO_PARCELADO: "Crédito parcelado",
  DEBITO: "Cartão de débito",
  TRANSFERENCIA: "Transferência",
  BOLETO: "Boleto",
};

export const EXPENSE_CATEGORIES = [
  "Aluguel", "Produtos e insumos", "Salários", "Comissões", "Impostos", "Marketing",
  "Água, luz e internet", "Equipamentos", "Manutenção", "Taxas de cartão", "Outros",
];

export const BUDGET_STATUS: Record<string, { label: string; cls: string }> = {
  ABERTO: { label: "Em aberto", cls: "bg-sky-100 text-sky-800 border-sky-300" },
  APROVADO: { label: "Aprovado", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  RECUSADO: { label: "Recusado", cls: "bg-red-100 text-red-800 border-red-300" },
  CANCELADO: { label: "Cancelado", cls: "bg-gray-100 text-gray-500 border-gray-300" },
};

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Aceita "1.234,56", "1234,56" ou "1234.56" */
export function parseMoney(v: FormDataEntryValue | string | null | undefined) {
  if (v == null) return 0;
  let s = String(v).trim().replace(/[R$\s]/g, "");
  if (!s) return 0;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? round2(n) : 0;
}

/** Valor para preencher campo de formulário: 1234.5 -> "1234,50" */
export function moneyInput(n: number) {
  return n.toFixed(2).replace(".", ",");
}

export type ReceivableLike = { amount: number; settledAt: Date | string | null; canceled: boolean; dueDate: Date | string; paid: number };
export function receivableStatus(r: ReceivableLike) {
  if (r.canceled) return { key: "CANCELADA", label: "Cancelada", cls: "bg-gray-100 text-gray-500 border-gray-300" };
  if (r.settledAt || r.paid >= r.amount - 0.005) return { key: "PAGA", label: "Paga", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" };
  const overdue = dateKey(new Date(r.dueDate)) < todayKey();
  if (r.paid > 0) return { key: "PARCIAL", label: overdue ? "Parcial · vencida" : "Parcial", cls: "bg-amber-100 text-amber-800 border-amber-300" };
  if (overdue) return { key: "VENCIDA", label: "Vencida", cls: "bg-red-100 text-red-800 border-red-300" };
  return { key: "ABERTA", label: "Em aberto", cls: "bg-sky-100 text-sky-800 border-sky-300" };
}

/** Soma meses mantendo o dia (31/01 + 1 mês = 28/02) */
export function addMonths(key: string, n: number) {
  const [y, m, d] = key.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}

/** 1º e último dia do mês ("2026-11") */
export function monthRange(ym: string) {
  const start = `${ym}-01`;
  const end = addMonths(start, 1);
  return { start: localToDate(start), end: localToDate(end) };
}

// ---------- Valor por extenso (para recibos) ----------
const UN = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZ = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CEM = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function ate999(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100), r = n % 100;
  const parts: string[] = [];
  if (c) parts.push(CEM[c]);
  if (r < 20) { if (r) parts.push(UN[r]); }
  else { parts.push(DEZ[Math.floor(r / 10)] + (r % 10 ? " e " + UN[r % 10] : "")); }
  return parts.join(" e ");
}

function inteiro(n: number): string {
  if (n === 0) return "zero";
  const grupos: [number, string, string][] = [[1e9, "bilhão", "bilhões"], [1e6, "milhão", "milhões"], [1e3, "mil", "mil"]];
  const parts: string[] = [];
  let rest = n;
  for (const [v, s, p] of grupos) {
    const q = Math.floor(rest / v);
    if (q) { parts.push(v === 1e3 && q === 1 ? "mil" : `${ate999(q)} ${q === 1 ? s : p}`); rest %= v; }
  }
  if (rest) parts.push(ate999(rest));
  if (parts.length > 1 && (rest < 100 || rest % 100 === 0) && rest > 0) {
    const last = parts.pop()!;
    return parts.join(" ") + " e " + last;
  }
  return parts.join(" ");
}

export function valorPorExtenso(v: number) {
  const reais = Math.floor(round2(v));
  const centavos = Math.round((round2(v) - reais) * 100);
  const r = reais ? `${inteiro(reais)}${reais >= 1e6 && reais % 1e6 === 0 ? " de" : ""} ${reais === 1 ? "real" : "reais"}` : "";
  const c = centavos ? `${inteiro(centavos)} ${centavos === 1 ? "centavo" : "centavos"}` : "";
  return [r, c].filter(Boolean).join(" e ") || "zero reais";
}
