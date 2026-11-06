"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, addMonths, localToDate, parseMoney, round2, str, todayKey } from "@/lib/utils";

export async function saveExpense(_: unknown, fd: FormData) {
  await requireUser(["ADMIN"]);
  const id = str(fd, "id");
  const description = str(fd, "description");
  const amount = parseMoney(fd.get("amount"));
  const category = str(fd, "category") ?? "Outros";
  const due = str(fd, "dueDate") ?? todayKey();
  const repeat = Math.max(1, Math.min(60, Number(str(fd, "repeat") ?? 1)));
  const paidNow = fd.get("paidNow") === "1";
  const method = str(fd, "method");
  if (!description) return { error: "Informe a descrição." };
  if (!(amount > 0)) return { error: "Informe o valor." };
  if (!EXPENSE_CATEGORIES.includes(category)) return { error: "Categoria inválida." };
  if (paidNow && (!method || !PAYMENT_METHODS[method])) return { error: "Informe a forma de pagamento." };

  const base = { description, amount, category, supplier: str(fd, "supplier"), notes: str(fd, "notes") };
  if (id) {
    await db.expense.update({ where: { id }, data: { ...base, dueDate: localToDate(due, "12:00") } });
  } else {
    // "Repetir" cria uma conta por mês (aluguel, internet...)
    for (let i = 0; i < repeat; i++) {
      await db.expense.create({
        data: {
          ...base,
          description: repeat > 1 ? `${description} (${i + 1}/${repeat})` : description,
          dueDate: localToDate(addMonths(due, i), "12:00"),
          ...(i === 0 && paidNow ? { paidAt: new Date(), method } : {}),
        },
      });
    }
  }
  revalidatePath("/financeiro", "layout");
  return { ok: true };
}

export async function payExpense(id: string, fd: FormData) {
  await requireUser(["ADMIN"]);
  const method = str(fd, "method");
  const date = str(fd, "paidAt") ?? todayKey();
  if (!method || !PAYMENT_METHODS[method]) return;
  await db.expense.update({ where: { id }, data: { method, paidAt: date === todayKey() ? new Date() : localToDate(date, "12:00") } });
  revalidatePath("/financeiro", "layout");
}

export async function unpayExpense(id: string) {
  await requireUser(["ADMIN"]);
  const e = await db.expense.findUniqueOrThrow({ where: { id } });
  if (e.payoutId) return; // pagamento de comissão: desfazer pela tela de comissões
  await db.expense.update({ where: { id }, data: { paidAt: null, method: null } });
  revalidatePath("/financeiro", "layout");
}

export async function deleteExpense(id: string) {
  await requireUser(["ADMIN"]);
  const e = await db.expense.findUniqueOrThrow({ where: { id } });
  if (e.payoutId) return;
  await db.expense.delete({ where: { id } });
  revalidatePath("/financeiro", "layout");
}

/** Paga as comissões pendentes de uma profissional até a data informada e lança a despesa. */
export async function payCommissions(professionalId: string, untilKey: string, fd: FormData) {
  await requireUser(["ADMIN"]);
  const method = str(fd, "method") ?? "PIX";
  const until = localToDate(untilKey);
  const entries = await db.commissionEntry.findMany({
    where: { professionalId, payoutId: null, payment: { paidAt: { lt: until } } },
  });
  if (!entries.length) return;
  const amount = round2(entries.reduce((s, e) => s + e.amount, 0));
  const prof = await db.user.findUniqueOrThrow({ where: { id: professionalId } });
  await db.$transaction(async (tx) => {
    const payout = await tx.commissionPayout.create({ data: { professionalId, amount, paidAt: new Date() } });
    await tx.commissionEntry.updateMany({ where: { id: { in: entries.map((e) => e.id) } }, data: { payoutId: payout.id } });
    await tx.expense.create({
      data: { description: `Comissão — ${prof.name}`, category: "Comissões", amount, dueDate: new Date(), paidAt: new Date(), method, payoutId: payout.id },
    });
  });
  revalidatePath("/financeiro", "layout");
}

export async function undoPayout(payoutId: string) {
  await requireUser(["ADMIN"]);
  await db.$transaction([
    db.commissionEntry.updateMany({ where: { payoutId }, data: { payoutId: null } }),
    db.commissionPayout.delete({ where: { id: payoutId } }), // a despesa é apagada junto (cascade)
  ]);
  revalidatePath("/financeiro", "layout");
}
