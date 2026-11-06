import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { budgetTotals } from "@/lib/finance";
import { makePdf, signature, table, title } from "@/lib/pdf";
import { fmtDate, fmtMoney } from "@/lib/utils";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return new Response("Não autorizado", { status: 401 });
  const { id } = await params;
  const b = await db.budget.findUnique({
    where: { id },
    include: {
      patient: true, professional: true,
      items: { include: { professional: true } },
      receivables: { where: { canceled: false }, orderBy: { dueDate: "asc" } },
    },
  });
  if (!b) return new Response("Não encontrado", { status: 404 });
  const t = budgetTotals(b);
  const isPlan = b.status === "APROVADO";

  return makePdf(`orcamento-${b.number}`, (doc) => {
    title(
      doc,
      isPlan ? "PLANO DE TRATAMENTO" : "ORÇAMENTO",
      `Nº ${b.number} · emitido em ${fmtDate(b.createdAt)}${b.validUntil ? ` · válido até ${fmtDate(b.validUntil)}` : ""}`,
    );
    const field = (k: string, v: string) => doc.font("Helvetica-Bold").fontSize(11).text(`${k}: `, { continued: true }).font("Helvetica").text(v);
    field("Cliente", b.patient.name);
    if (b.patient.phone) field("Telefone", b.patient.phone);
    field("Profissional responsável", b.professional.name);
    doc.moveDown(1);

    // Largura útil A4 com margens: 485pt
    table(
      doc,
      [
        { label: "Procedimento", width: 195 },
        { label: "Profissional", width: 110 },
        { label: "Sessões", width: 50, align: "center" },
        { label: "Valor unit.", width: 65, align: "right" },
        { label: "Total", width: 65, align: "right" },
      ],
      b.items.map((i) => [i.description, (i.professional ?? b.professional).name, String(i.quantity), fmtMoney(i.unitPrice), fmtMoney(i.unitPrice * i.quantity)]),
    );

    const right = (label: string, value: string, bold = false) =>
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 13 : 11).text(`${label}   ${value}`, { align: "right" });
    right("Subtotal:", fmtMoney(t.gross));
    if (t.discount > 0) right("Desconto:", `- ${fmtMoney(t.discount)}`);
    doc.moveDown(0.3);
    right("TOTAL:", fmtMoney(t.total), true);

    if (b.receivables.length) {
      doc.moveDown(1.2).font("Helvetica-Bold").fontSize(12).text("Condições de pagamento");
      doc.moveDown(0.5);
      table(
        doc,
        [{ label: "Parcela", width: 120 }, { label: "Vencimento", width: 180 }, { label: "Valor", width: 185, align: "right" }],
        b.receivables.map((r) => [r.installment ?? "-", fmtDate(r.dueDate), fmtMoney(r.amount)]),
      );
    }
    if (b.notes) {
      doc.moveDown(1).font("Helvetica-Bold").fontSize(11).text("Observações");
      doc.font("Helvetica").fontSize(10).text(b.notes, { align: "justify" });
    }
    signature(doc, b.patient.name, isPlan ? "Cliente — de acordo" : "Cliente");
  });
}
