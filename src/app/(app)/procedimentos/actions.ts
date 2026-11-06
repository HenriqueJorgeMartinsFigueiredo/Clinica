"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseMoney, str } from "@/lib/utils";

export async function saveProcedure(fd: FormData) {
  await requireUser(["ADMIN"]);
  const id = str(fd, "id");
  const data = {
    name: str(fd, "name") ?? "Sem nome",
    category: str(fd, "category"),
    durationMin: Number(str(fd, "durationMin") ?? 60),
    price: parseMoney(fd.get("price")),
    supplyCost: parseMoney(fd.get("supplyCost")),
    sessions: Number(str(fd, "sessions") ?? 1),
    description: str(fd, "description"),
    commissionPct: str(fd, "commissionPct") ? Math.min(100, Math.max(0, parseMoney(fd.get("commissionPct")))) : null,
    active: fd.get("active") !== "0",
  };
  if (id) await db.procedure.update({ where: { id }, data });
  else await db.procedure.create({ data });
  revalidatePath("/procedimentos");
}
