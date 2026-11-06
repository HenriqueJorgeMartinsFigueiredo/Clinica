"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { str } from "@/lib/utils";

export async function saveProcedure(fd: FormData) {
  await requireUser(["ADMIN"]);
  const id = str(fd, "id");
  const data = {
    name: str(fd, "name") ?? "Sem nome",
    category: str(fd, "category"),
    durationMin: Number(str(fd, "durationMin") ?? 60),
    price: Number((str(fd, "price") ?? "0").replace(/\./g, "").replace(",", ".")) || 0,
    sessions: Number(str(fd, "sessions") ?? 1),
    description: str(fd, "description"),
    active: fd.get("active") !== "0",
  };
  if (id) await db.procedure.update({ where: { id }, data });
  else await db.procedure.create({ data });
  revalidatePath("/procedimentos");
}
