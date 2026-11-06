"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PAYMENT_METHODS, parseMoney, str } from "@/lib/utils";

export async function saveSettings(fd: FormData) {
  await requireUser(["ADMIN"]);
  const data = {
    name: str(fd, "name") ?? "Clínica de Estética",
    document: str(fd, "document"), phone: str(fd, "phone"), email: str(fd, "email"),
    address: str(fd, "address"), city: str(fd, "city"),
  };
  await db.clinicSettings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
  revalidatePath("/configuracoes");
}

export async function saveFees(fd: FormData) {
  await requireUser(["ADMIN"]);
  const fees: Record<string, number> = {};
  for (const k of Object.keys(PAYMENT_METHODS)) {
    const v = Math.min(100, Math.max(0, parseMoney(fd.get(`fee_${k}`))));
    if (v) fees[k] = v;
  }
  const methodFees = JSON.stringify(fees);
  await db.clinicSettings.upsert({ where: { id: 1 }, update: { methodFees }, create: { id: 1, methodFees } });
  revalidatePath("/configuracoes");
}


export async function saveTemplate(fd: FormData) {
  await requireUser(["ADMIN"]);
  const id = str(fd, "id");
  const data = {
    title: str(fd, "title") ?? "Termo",
    body: String(fd.get("body") ?? ""),
    procedureId: str(fd, "procedureId"),
    active: fd.get("active") !== "0",
  };
  if (id) await db.consentTemplate.update({ where: { id }, data });
  else await db.consentTemplate.create({ data });
  revalidatePath("/configuracoes");
}
