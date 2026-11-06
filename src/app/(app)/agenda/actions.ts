"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { STATUS, localToDate, str } from "@/lib/utils";

export type ActionResult = { ok?: boolean; error?: string };

export async function saveAppointment(_: unknown, fd: FormData): Promise<ActionResult> {
  await requireUser();
  const id = str(fd, "id");
  let patientId = str(fd, "patientId");
  const newPatientName = str(fd, "newPatientName");
  const newPatientPhone = str(fd, "newPatientPhone");
  const professionalId = str(fd, "professionalId");
  const procedureId = str(fd, "procedureId");
  const date = str(fd, "date");
  const time = str(fd, "time");
  const duration = Number(str(fd, "duration") ?? 60);
  const status = str(fd, "status") ?? "AGENDADO";

  if (!patientId && !newPatientName) return { error: "Escolha a cliente ou cadastre uma nova." };
  if (!professionalId) return { error: "Escolha a profissional." };
  if (!date || !time) return { error: "Informe data e horário." };
  if (!(duration > 0)) return { error: "Duração inválida." };
  if (!STATUS[status]) return { error: "Status inválido." };

  const start = localToDate(date, time);
  const end = new Date(start.getTime() + duration * 60_000);

  // Evita dois atendimentos ao mesmo tempo com a mesma profissional
  const conflict = await db.appointment.findFirst({
    where: {
      professionalId,
      status: { notIn: ["CANCELADO", "FALTOU"] },
      start: { lt: end },
      end: { gt: start },
      ...(id ? { NOT: { id } } : {}),
    },
    include: { patient: true },
  });
  if (conflict && status !== "CANCELADO") {
    return { error: `Horário ocupado: já existe atendimento com ${conflict.patient.name} nesse período.` };
  }

  if (!patientId && newPatientName) {
    const p = await db.patient.create({ data: { name: newPatientName, phone: newPatientPhone } });
    patientId = p.id;
  }

  const data = {
    patientId: patientId!,
    professionalId,
    procedureId,
    start,
    end,
    status,
    room: str(fd, "room"),
    notes: str(fd, "notes"),
  };
  if (id) await db.appointment.update({ where: { id }, data });
  else await db.appointment.create({ data });

  revalidatePath("/agenda");
  revalidatePath("/");
  return { ok: true };
}

export async function setAppointmentStatus(id: string, status: string) {
  await requireUser();
  if (!STATUS[status]) return;
  await db.appointment.update({ where: { id }, data: { status } });
  revalidatePath("/agenda");
  revalidatePath("/");
}

export async function deleteAppointment(id: string) {
  await requireUser();
  await db.appointment.delete({ where: { id } });
  revalidatePath("/agenda");
  revalidatePath("/");
}
