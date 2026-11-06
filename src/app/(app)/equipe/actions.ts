"use server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ROLES, str } from "@/lib/utils";

export async function saveUser(_: unknown, fd: FormData) {
  const me = await requireUser(["ADMIN"]);
  const id = str(fd, "id");
  const email = str(fd, "email")?.toLowerCase();
  const password = str(fd, "password");
  const role = str(fd, "role") ?? "PROFISSIONAL";
  if (!email || !str(fd, "name")) return { error: "Nome e e-mail são obrigatórios." };
  if (!ROLES[role]) return { error: "Perfil inválido." };
  if (!id && (!password || password.length < 8)) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  if (password && password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  const dup = await db.user.findFirst({ where: { email, ...(id ? { NOT: { id } } : {}) } });
  if (dup) return { error: "Já existe um usuário com esse e-mail." };
  const active = fd.get("active") !== "0";
  if (id === me.userId && (!active || role !== "ADMIN")) return { error: "Você não pode remover seu próprio acesso de administrador." };

  const data = {
    name: str(fd, "name")!, email, role, active,
    specialty: str(fd, "specialty"),
    color: str(fd, "color") ?? "#a855f7",
    ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
  };
  if (id) await db.user.update({ where: { id }, data });
  else await db.user.create({ data: { ...data, passwordHash: data.passwordHash! } });
  revalidatePath("/equipe");
  return { ok: true };
}
