import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { addDays, localToDate, todayKey } from "@/lib/utils";
import { AgendaClient } from "./AgendaClient";

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const s = await requireUser();
  const { data } = await searchParams;
  const day = data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : todayKey();

  const [appointments, professionals, procedures, patients] = await Promise.all([
    db.appointment.findMany({
      where: { start: { gte: localToDate(day), lt: localToDate(addDays(day, 1)) } },
      include: { patient: { select: { id: true, name: true, phone: true } }, procedure: true },
      orderBy: { start: "asc" },
    }),
    db.user.findMany({
      where: { active: true, role: { in: ["PROFISSIONAL", "ADMIN"] } },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
    db.procedure.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.patient.findMany({ where: { active: true }, select: { id: true, name: true, phone: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <AgendaClient
      day={day}
      currentUserId={s.userId}
      currentRole={s.role}
      appointments={appointments.map((a) => ({ ...a, start: a.start.toISOString(), end: a.end.toISOString() }))}
      professionals={professionals}
      procedures={procedures.map((p) => ({ id: p.id, name: p.name, durationMin: p.durationMin }))}
      patients={patients}
    />
  );
}
