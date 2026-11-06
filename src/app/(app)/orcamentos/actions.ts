"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { budgetTotals, newBudgetNumber, registerPayment } from "@/lib/finance";
import { PAYMENT_METHODS, addMonths, localToDate, parseMoney, round2, str, todayKey } from "@/lib/utils";

const itemSchema = z.object({
  procedureId: z.string().nullable(),
  professionalId: z.string().nullable(),
  description: z.string().min(1),
  unitPrice: z.number().min(0),
  supplyCost: z.number().min(0),
  quantity: z.number().int().min(1),
});

export async function saveBudget(_: unknown, fd: FormData) {
  await requireUser();
  const id = str(fd, "id");
  const patientId = str(fd, "patientId");
  const professionalId = str(fd, "professionalId");
  if (!patientId) return { error: "Escolha a cliente." };
  if (!professionalId) return { error: "Escolha a profissional responsável." };
  let items: z.infer<typeof itemSchema>[];
  try {
    items = z.array(itemSchema).min(1).parse(JSON.parse(String(fd.get("items") ?? "[]")));
  } catch {
    return { error: "Adicione pelo menos um procedimento com descrição, valor e quantidade." };
  }
  const gross = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const discount = parseMoney(fd.get("discount"));
  if (discount < 0 || discount > gross) return { error: "Desconto inválido." };
  const valid = str(fd, "validUntil");

  const data = {
    patientId, professionalId, discount,
    notes: str(fd, "notes"),
    validUntil: valid ? localToDate(valid, "12:00") : null,
  };

  let budgetId = id;
  if (id) {
    const b = await db.budget.findUniqueOrThrow({ where: { id } });
    if (b.status !== "ABERTO") return { error: "Só é possível editar orçamentos em aberto." };
    await db.$transaction([
      db.budgetItem.deleteMany({ where: { budgetId: id } }),
      db.budget.update({ where: { id }, data: { ...data, items: { create: items } } }),
    ]);
  } else {
    const b = await db.budget.create({ data: { ...data, number: await newBudgetNumber(), items: { create: items } } });
    budgetId = b.id;
  }
  revalidatePath("/orcamentos");
  redirect(`/orcamentos/${budgetId}`);
}

/** Aprova o orçamento e gera as parcelas (contas a receber). */
export async function approveBudget(_: unknown, fd: FormData) {
  const s = await requireUser();
  const id = str(fd, "id")!;
  const b = await db.budget.findUniqueOrThrow({ where: { id }, include: { items: true } });
  if (b.status !== "ABERTO") return { error: "Este orçamento não está em aberto." };
  const { total } = budgetTotals(b);

  const down = parseMoney(fd.get("downPayment"));
  const downMethod = str(fd, "downMethod") ?? "PIX";
  const n = Math.max(0, Math.min(36, Number(str(fd, "installments") ?? 1)));
  const firstDue = str(fd, "firstDue") ?? todayKey();
  if (down < 0 || down > total + 0.001) return { error: "Valor de entrada inválido." };
  if (!PAYMENT_METHODS[downMethod]) return { error: "Forma de pagamento inválida." };
  const rest = round2(total - down);
  if (rest > 0 && n < 1) return { error: "Informe em quantas parcelas o restante será pago." };

  const label = `Orçamento nº ${b.number}`;
  const parts: { description: string; installment: string | null; dueDate: Date; amount: number }[] = [];
  if (rest > 0) {
    const base = Math.floor((rest / n) * 100) / 100;
    for (let i = 0; i < n; i++) {
      const amount = i === n - 1 ? round2(rest - base * (n - 1)) : base;
      parts.push({ description: label, installment: `${i + 1}/${n}`, dueDate: localToDate(addMonths(firstDue, i), "12:00"), amount });
    }
  }

  let downReceivableId: string | null = null;
  await db.$transaction(async (tx) => {
    await tx.budget.update({ where: { id }, data: { status: "APROVADO", approvedAt: new Date() } });
    if (down > 0) {
      const r = await tx.receivable.create({
        data: { patientId: b.patientId, budgetId: id, description: label, installment: "Entrada", dueDate: localToDate(todayKey(), "12:00"), amount: down },
      });
      downReceivableId = r.id;
    }
    for (const p of parts) await tx.receivable.create({ data: { ...p, patientId: b.patientId, budgetId: id } });
  });

  if (downReceivableId && fd.get("downPaidNow") === "1") {
    await registerPayment({
      patientId: b.patientId, receivableId: downReceivableId, amount: down, method: downMethod,
      paidAt: new Date(), createdById: s.userId, description: `${label} — entrada`,
    });
  }
  revalidatePath(`/orcamentos/${id}`);
  revalidatePath("/orcamentos");
  revalidatePath("/financeiro", "layout");
  return { ok: true };
}

export async function setBudgetStatus(id: string, status: "RECUSADO" | "CANCELADO" | "ABERTO") {
  await requireUser();
  const b = await db.budget.findUniqueOrThrow({ where: { id }, include: { receivables: { include: { payments: true } } } });
  if (status === "CANCELADO" || status === "ABERTO") {
    const hasPayments = b.receivables.some((r) => r.payments.length > 0);
    if (status === "ABERTO" && hasPayments) return;
    // parcelas sem pagamento são canceladas; as já pagas ficam registradas
    await db.receivable.updateMany({ where: { budgetId: id, payments: { none: {} } }, data: { canceled: true } });
    if (status === "ABERTO") await db.receivable.deleteMany({ where: { budgetId: id } });
  }
  await db.budget.update({ where: { id }, data: { status, ...(status === "ABERTO" ? { approvedAt: null } : {}) } });
  revalidatePath(`/orcamentos/${id}`);
  revalidatePath("/orcamentos");
}

export async function deleteBudget(id: string) {
  await requireUser(["ADMIN"]);
  const b = await db.budget.findUniqueOrThrow({ where: { id } });
  if (b.status === "APROVADO") return;
  await db.budget.delete({ where: { id } });
  revalidatePath("/orcamentos");
  redirect("/orcamentos");
}
