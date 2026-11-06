"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { localToDate, str } from "@/lib/utils";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

function patientData(fd: FormData) {
  const birth = str(fd, "birthDate");
  return {
    name: str(fd, "name") ?? "",
    cpf: str(fd, "cpf"),
    phone: str(fd, "phone"),
    email: str(fd, "email"),
    birthDate: birth ? localToDate(birth, "12:00") : null,
    gender: str(fd, "gender"),
    address: str(fd, "address"),
    occupation: str(fd, "occupation"),
    origin: str(fd, "origin"),
    notes: str(fd, "notes"),
  };
}

export async function savePatient(_: unknown, fd: FormData) {
  await requireUser();
  const id = str(fd, "id");
  const data = patientData(fd);
  if (!data.name) return { error: "Informe o nome." };
  const p = id ? await db.patient.update({ where: { id }, data }) : await db.patient.create({ data });
  revalidatePath("/pacientes");
  redirect(`/pacientes/${p.id}`);
}

export async function togglePatientActive(id: string) {
  await requireUser(["ADMIN"]);
  const p = await db.patient.findUniqueOrThrow({ where: { id } });
  await db.patient.update({ where: { id }, data: { active: !p.active } });
  revalidatePath(`/pacientes/${id}`);
  revalidatePath("/pacientes");
}

export async function saveAnamnesis(patientId: string, fd: FormData) {
  await requireUser();
  const data: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string" && v.trim()) data[k] = v.trim();
  await db.anamnesis.create({ data: { patientId, data: JSON.stringify(data) } });
  revalidatePath(`/pacientes/${patientId}`);
  redirect(`/pacientes/${patientId}?aba=anamnese`);
}

export async function addEvolution(patientId: string, fd: FormData) {
  const s = await requireUser();
  const text = str(fd, "text");
  if (!text) return;
  const date = str(fd, "date");
  await db.evolution.create({
    data: {
      patientId,
      professionalId: s.userId,
      procedureId: str(fd, "procedureId"),
      text,
      date: date ? localToDate(date, "12:00") : new Date(),
    },
  });
  revalidatePath(`/pacientes/${patientId}`);
}

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export async function uploadPhotos(patientId: string, fd: FormData) {
  await requireUser();
  await mkdir(UPLOAD_DIR, { recursive: true });
  const label = str(fd, "label") ?? "ANTES";
  const region = str(fd, "region");
  const files = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  for (const f of files) {
    if (!ALLOWED.includes(f.type)) continue;
    const fileName = `${randomUUID()}.${f.type.split("/")[1]}`;
    await writeFile(path.join(UPLOAD_DIR, fileName), Buffer.from(await f.arrayBuffer()));
    await db.photo.create({ data: { patientId, fileName, mimeType: f.type, label, region } });
  }
  revalidatePath(`/pacientes/${patientId}`);
}

export async function deletePhoto(id: string) {
  await requireUser();
  const p = await db.photo.delete({ where: { id } });
  await unlink(path.join(UPLOAD_DIR, p.fileName)).catch(() => {});
  revalidatePath(`/pacientes/${p.patientId}`);
}
