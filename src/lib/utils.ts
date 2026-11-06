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
