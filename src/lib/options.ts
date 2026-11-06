import "server-only";
import { db } from "./db";

export async function formOptions() {
  const [patients, professionals, procedures] = await Promise.all([
    db.patient.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.user.findMany({ where: { active: true, role: { in: ["PROFISSIONAL", "ADMIN"] } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.procedure.findMany({ where: { active: true }, select: { id: true, name: true, price: true, sessions: true }, orderBy: { name: "asc" } }),
  ]);
  return { patients, professionals, procedures };
}
