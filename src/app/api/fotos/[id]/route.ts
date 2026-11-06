import { readFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

// Fotos ficam fora da pasta pública: só usuários logados conseguem ver (LGPD).
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return new Response("Não autorizado", { status: 401 });
  const { id } = await params;
  const photo = await db.photo.findUnique({ where: { id } });
  if (!photo) return new Response("Não encontrado", { status: 404 });
  const file = await readFile(path.join(process.cwd(), "uploads", photo.fileName));
  return new Response(file, { headers: { "Content-Type": photo.mimeType, "Cache-Control": "private, max-age=3600" } });
}
