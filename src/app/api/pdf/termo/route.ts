import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/finance";
import { makePdf, signature, title } from "@/lib/pdf";
import { age, fmtDate } from "@/lib/utils";

/** Termo de consentimento: /api/pdf/termo?modelo=ID&paciente=ID */
export async function GET(req: Request) {
  if (!(await getSession())) return new Response("Não autorizado", { status: 401 });
  const url = new URL(req.url);
  const [tpl, p, s] = await Promise.all([
    db.consentTemplate.findUnique({ where: { id: url.searchParams.get("modelo") ?? "" }, include: { procedure: true } }),
    db.patient.findUnique({ where: { id: url.searchParams.get("paciente") ?? "" } }),
    getSettings(),
  ]);
  if (!tpl || !p) return new Response("Não encontrado", { status: 404 });

  const today = fmtDate(new Date(), { day: "numeric", month: "long", year: "numeric" });
  const vars: Record<string, string> = {
    paciente: p.name,
    cpf: p.cpf ?? "____________________",
    idade: age(p.birthDate)?.toString() ?? "___",
    procedimento: tpl.procedure?.name ?? tpl.title,
    clinica: s.name,
    data: today,
  };
  const body = tpl.body.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => vars[k] ?? m);

  return makePdf(`termo-${p.name.split(" ")[0].toLowerCase()}`, (doc) => {
    title(doc, "TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO", tpl.title);
    doc.font("Helvetica").fontSize(11);
    for (const para of body.split(/\n\s*\n/)) {
      doc.text(para.trim(), { align: "justify", lineGap: 3 });
      doc.moveDown(0.8);
    }
    doc.moveDown(0.5).text(`${s.city ? s.city + ", " : ""}${today}.`, { align: "right" });
    signature(doc, p.name, p.cpf ? `CPF ${p.cpf}` : "Cliente");
    signature(doc, "Profissional responsável", s.name);
  });
}
