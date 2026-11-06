import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/finance";
import { makePdf, signature, title } from "@/lib/pdf";
import { PAYMENT_METHODS, fmtDate, fmtMoney, valorPorExtenso } from "@/lib/utils";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return new Response("Não autorizado", { status: 401 });
  const { id } = await params;
  const p = await db.payment.findUnique({ where: { id }, include: { patient: true } });
  if (!p) return new Response("Não encontrado", { status: 404 });
  const s = await getSettings();

  return makePdf(`recibo-${p.number}`, (doc) => {
    title(doc, "RECIBO", `Nº ${String(p.number).padStart(5, "0")}`);
    doc.font("Helvetica-Bold").fontSize(22).text(fmtMoney(p.amount), { align: "right" });
    doc.moveDown(1);
    doc.font("Helvetica").fontSize(12).text(
      `Recebemos de ${p.patient.name}${p.patient.cpf ? `, CPF ${p.patient.cpf}` : ""}, a importância de ${fmtMoney(p.amount)} ` +
        `(${valorPorExtenso(p.amount)}), referente a ${p.description ?? "serviços estéticos"}.`,
      { align: "justify", lineGap: 4 },
    );
    doc.moveDown(1);
    doc.fontSize(11).text(`Forma de pagamento: ${PAYMENT_METHODS[p.method] ?? p.method}`);
    doc.text(`Data do pagamento: ${fmtDate(p.paidAt)}`);
    doc.moveDown(1.5);
    doc.text(`${s.city ? s.city + ", " : ""}${fmtDate(p.paidAt, { day: "numeric", month: "long", year: "numeric" })}.`, { align: "right" });
    signature(doc, s.name, s.document ? `CNPJ/CPF ${s.document}` : undefined);
  });
}
