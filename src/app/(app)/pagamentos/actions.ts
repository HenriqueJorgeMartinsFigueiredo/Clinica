"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { receivablePaid, registerPayment } from "@/lib/finance";
import { PAYMENT_METHODS, localToDate, parseMoney, round2, str, todayKey } from "@/lib/utils";

export async function receivePayment(_: unknown, fd: FormData) {
  const s = await requireUser(["ADMIN", "RECEPCAO", "PROFISSIONAL"]);
  const patientId = str(fd, "patientId");
  const receivableId = str(fd, "receivableId");
  const amount = parseMoney(fd.get("amount"));
  const method = str(fd, "method") ?? "";
  const date = str(fd, "paidAt") ?? todayKey();
  if (!patientId) return { error: "Escolha a cliente." };
  if (!(amount > 0)) return { error: "Informe o valor recebido." };
  const fee = parseMoney(fd.get("fee"));
  if (fee < 0 || fee >= amount) return { error: "Taxa da maquininha inválida." };
  if (parseMoney(fd.get("supplies")) < 0) return { error: "Valor de insumos inválido." };
  if (!PAYMENT_METHODS[method]) return { error: "Escolha a forma de pagamento." };

  let description = str(fd, "description");
  if (receivableId) {
    const r = await db.receivable.findUnique({ where: { id: receivableId } });
    if (!r || r.patientId !== patientId || r.canceled) return { error: "Parcela inválida." };
    const open = round2(r.amount - (await receivablePaid(receivableId)));
    if (amount > open + 0.005) return { error: `O valor é maior que o saldo da parcela (${open.toFixed(2).replace(".", ",")}).` };
    description ??= `${r.description}${r.installment ? ` — parcela ${r.installment}` : ""}`;
  } else {
    if (!str(fd, "professionalId")) return { error: "Informe a profissional que realizou o atendimento (para a comissão)." };
    const procId = str(fd, "procedureId");
    if (!description && procId) description = (await db.procedure.findUnique({ where: { id: procId } }))?.name ?? null;
  }

  const p = await registerPayment({
    patientId, receivableId, amount, method,
    paidAt: date === todayKey() ? new Date() : localToDate(date, "12:00"),
    createdById: s.userId,
    professionalId: str(fd, "professionalId"),
    procedureId: str(fd, "procedureId"),
    description,
    notes: str(fd, "notes"),
    settle: fd.get("settle") === "1",
    fee,
    supplies: receivableId ? null : parseMoney(fd.get("supplies")),
  });
  revalidatePath("/financeiro", "layout");
  redirect(`/pagamentos/${p.id}`);
}

/** Estorno: apaga o pagamento e as comissões geradas por ele. */
export async function deletePayment(id: string) {
  await requireUser(["ADMIN"]);
  const p = await db.payment.findUniqueOrThrow({ where: { id }, include: { commissions: true, receivable: true } });
  if (p.commissions.some((c) => c.payoutId)) {
    redirect(`/pagamentos/${id}?erro=comissao-paga`);
  }
  await db.$transaction(async (tx) => {
    await tx.payment.delete({ where: { id } });
    if (p.receivable?.settledAt) await tx.receivable.update({ where: { id: p.receivable.id }, data: { settledAt: null } });
  });
  revalidatePath("/financeiro", "layout");
  redirect(`/pacientes/${p.patientId}?aba=financeiro`);
}
