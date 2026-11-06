import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { round2 } from "./utils";

type Tx = Prisma.TransactionClient;

/**
 * Divide um valor PAGO entre as profissionais e calcula a comissão de cada uma.
 * A regra: comissão = (parte do valor efetivamente pago) × (% de comissão).
 *  - Pagamento de parcela de orçamento: o valor é rateado entre os itens do orçamento
 *    na proporção do valor de cada item (descontos e negociações reduzem a comissão).
 *  - Parcela sem orçamento / pagamento avulso: tudo vai para a profissional indicada.
 *  - % usado: o do procedimento (se definido) ou o padrão da profissional.
 */
async function computeCommissions(
  tx: Tx,
  amount: number,
  opts: { receivableId?: string | null; professionalId?: string | null; procedureId?: string | null },
) {
  const shares: { professionalId: string; base: number; pct: number }[] = [];

  const receivable = opts.receivableId
    ? await tx.receivable.findUnique({
        where: { id: opts.receivableId },
        include: { budget: { include: { items: { include: { procedure: true, professional: true } }, professional: true } }, professional: true },
      })
    : null;

  if (receivable?.budget) {
    const b = receivable.budget;
    const gross = b.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    if (gross > 0) {
      for (const it of b.items) {
        const prof = it.professional ?? b.professional;
        const pct = it.procedure?.commissionPct ?? prof.commissionPct;
        shares.push({ professionalId: prof.id, base: (amount * it.unitPrice * it.quantity) / gross, pct });
      }
    }
  } else {
    const profId = receivable?.professionalId ?? opts.professionalId;
    if (profId) {
      const prof = await tx.user.findUnique({ where: { id: profId } });
      const proc = opts.procedureId ? await tx.procedure.findUnique({ where: { id: opts.procedureId } }) : null;
      if (prof) shares.push({ professionalId: prof.id, base: amount, pct: proc?.commissionPct ?? prof.commissionPct });
    }
  }

  // Agrupa por profissional + %
  const grouped = new Map<string, { professionalId: string; base: number; pct: number }>();
  for (const s of shares) {
    const k = `${s.professionalId}|${s.pct}`;
    const g = grouped.get(k);
    if (g) g.base += s.base;
    else grouped.set(k, { ...s });
  }
  return [...grouped.values()]
    .filter((g) => g.pct > 0 && g.base > 0)
    .map((g) => ({ ...g, base: round2(g.base), amount: round2((g.base * g.pct) / 100) }));
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
}) {
  return db.$transaction(async (tx) => {
    const commissions = await computeCommissions(tx, input.amount, input);
    const payment = await tx.payment.create({
      data: {
        number: await nextNumber(tx, "payment"),
        patientId: input.patientId,
        receivableId: input.receivableId || null,
        professionalId: input.receivableId ? null : input.professionalId || null,
        procedureId: input.receivableId ? null : input.procedureId || null,
        amount: round2(input.amount),
        method: input.method,
        paidAt: input.paidAt,
        description: input.description,
        notes: input.notes,
        createdById: input.createdById,
        commissions: { create: commissions },
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

export function budgetTotals(b: { discount: number; items: { unitPrice: number; quantity: number }[] }) {
  const gross = round2(b.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0));
  return { gross, discount: b.discount, total: round2(gross - b.discount) };
}
