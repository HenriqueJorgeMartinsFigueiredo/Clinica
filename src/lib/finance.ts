import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { round2 } from "./utils";

type Tx = Prisma.TransactionClient;

/**
 * Divide um valor PAGO entre as profissionais e calcula a comissão de cada uma.
 *
 *   base da comissão = valor pago − taxa da maquininha − custo dos insumos
 *   comissão = base × %
 *
 *  - Parcela de orçamento: o valor pago e a taxa são rateados entre os itens na proporção
 *    do valor de cada item. Os insumos de cada item são descontados na proporção do que
 *    foi pago do plano (pagou 20% do plano → desconta 20% dos insumos), então ao final
 *    todos os insumos foram descontados uma única vez.
 *  - Parcela sem orçamento / pagamento avulso: tudo vai para a profissional indicada;
 *    insumos = os informados no pagamento (padrão: custo do procedimento).
 *  - % usado: o do procedimento (se definido) ou o padrão da profissional.
 *  - A base nunca fica negativa.
 */
type Share = { professionalId: string; pct: number; gross: number; fee: number; supplies: number };

async function computeCommissions(
  tx: Tx,
  amount: number,
  fee: number,
  opts: { receivableId?: string | null; professionalId?: string | null; procedureId?: string | null; supplies?: number | null },
) {
  const shares: Share[] = [];

  const receivable = opts.receivableId
    ? await tx.receivable.findUnique({
        where: { id: opts.receivableId },
        include: { budget: { include: { items: { include: { procedure: true, professional: true } }, professional: true } } },
      })
    : null;

  if (receivable?.budget) {
    const b = receivable.budget;
    const gross = b.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const total = gross - b.discount;
    if (gross > 0) {
      const paidFraction = total > 0 ? Math.min(1, amount / total) : 0;
      for (const it of b.items) {
        const prof = it.professional ?? b.professional;
        const w = (it.unitPrice * it.quantity) / gross;
        shares.push({
          professionalId: prof.id,
          pct: it.procedure?.commissionPct ?? prof.commissionPct,
          gross: amount * w,
          fee: fee * w,
          supplies: it.supplyCost * it.quantity * paidFraction,
        });
      }
    }
  } else {
    const profId = receivable?.professionalId ?? opts.professionalId;
    if (profId) {
      const prof = await tx.user.findUnique({ where: { id: profId } });
      const proc = opts.procedureId ? await tx.procedure.findUnique({ where: { id: opts.procedureId } }) : null;
      if (prof) {
        shares.push({
          professionalId: prof.id,
          pct: proc?.commissionPct ?? prof.commissionPct,
          gross: amount,
          fee,
          supplies: opts.supplies ?? proc?.supplyCost ?? 0,
        });
      }
    }
  }

  // Agrupa por profissional + %
  const grouped = new Map<string, Share>();
  for (const sh of shares) {
    const k = `${sh.professionalId}|${sh.pct}`;
    const g = grouped.get(k);
    if (g) { g.gross += sh.gross; g.fee += sh.fee; g.supplies += sh.supplies; }
    else grouped.set(k, { ...sh });
  }
  const all = [...grouped.values()].map((g) => {
    const gross = round2(g.gross), fee = round2(g.fee), supplies = round2(g.supplies);
    const base = Math.max(0, round2(gross - fee - supplies));
    return { professionalId: g.professionalId, pct: g.pct, gross, fee, supplies, base, amount: round2((base * g.pct) / 100) };
  });
  return {
    entries: all.filter((e) => e.pct > 0 && e.base > 0),
    supplies: round2(all.reduce((s, e) => s + e.supplies, 0)),
  };
}

async function nextNumber(tx: Tx, model: "payment" | "budget") {
  const agg =
    model === "payment"
      ? await tx.payment.aggregate({ _max: { number: true } })
      : await tx.budget.aggregate({ _max: { number: true } });
  return (agg._max.number ?? 0) + 1;
}

export async function registerPayment(input: {
  patientId: string;
  amount: number;
  method: string;
  paidAt: Date;
  createdById: string;
  receivableId?: string | null;
  professionalId?: string | null;
  procedureId?: string | null;
  description?: string | null;
  notes?: string | null;
  settle?: boolean; // quitar parcela mesmo que pago a menos
  fee?: number; // taxa da maquininha em R$; se vazio, usa o % configurado
  supplies?: number | null; // insumos (só pagamento avulso); se vazio, usa o custo do procedimento
}) {
  const fee = round2(input.fee ?? (input.amount * (await methodFeePct(input.method))) / 100);
  return db.$transaction(async (tx) => {
    const commissions = await computeCommissions(tx, round2(input.amount), fee, input);
    const payment = await tx.payment.create({
      data: {
        number: await nextNumber(tx, "payment"),
        patientId: input.patientId,
        receivableId: input.receivableId || null,
        professionalId: input.receivableId ? null : input.professionalId || null,
        procedureId: input.receivableId ? null : input.procedureId || null,
        amount: round2(input.amount),
        fee,
        supplies: commissions.supplies,
        method: input.method,
        paidAt: input.paidAt,
        description: input.description,
        notes: input.notes,
        createdById: input.createdById,
        commissions: { create: commissions.entries },
      },
    });
    if (input.receivableId && input.settle) {
      await tx.receivable.update({ where: { id: input.receivableId }, data: { settledAt: input.paidAt } });
    }
    return payment;
  });
}

export async function newBudgetNumber() {
  return db.$transaction((tx) => nextNumber(tx, "budget"));
}

export async function receivablePaid(receivableId: string) {
  const agg = await db.payment.aggregate({ where: { receivableId }, _sum: { amount: true } });
  return round2(agg._sum.amount ?? 0);
}

export async function getSettings() {
  return (await db.clinicSettings.findUnique({ where: { id: 1 } })) ?? (await db.clinicSettings.create({ data: { id: 1 } }));
}

/** % de taxa configurado para a forma de pagamento */
export async function methodFeePct(method: string) {
  return parseFees((await getSettings()).methodFees)[method] ?? 0;
}

export function parseFees(json: string): Record<string, number> {
  try {
    return JSON.parse(json) ?? {};
  } catch {
    return {};
  }
}

export function budgetTotals(b: { discount: number; items: { unitPrice: number; quantity: number }[] }) {
  const gross = round2(b.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0));
  return { gross, discount: b.discount, total: round2(gross - b.discount) };
}
