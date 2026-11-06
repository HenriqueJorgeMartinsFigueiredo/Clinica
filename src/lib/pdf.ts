import "server-only";
import PDFDocument from "pdfkit";
import { getSettings } from "./finance";

const BRAND = "#9b2d50";
const MUTED = "#6b7280";

export type Doc = InstanceType<typeof PDFDocument>;

/** Cria um PDF A4 com o cabeçalho da clínica e devolve a Response pronta. */
export async function makePdf(fileName: string, draw: (doc: Doc) => void | Promise<void>) {
  const settings = await getSettings();
  const doc = new PDFDocument({ size: "A4", margins: { top: 50, bottom: 60, left: 55, right: 55 }, info: { Title: fileName } });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((res) => doc.on("end", () => res(Buffer.concat(chunks))));

  // Cabeçalho
  doc.fillColor(BRAND).font("Helvetica-Bold").fontSize(16).text(settings.name, { align: "left" });
  const line = [settings.document && `CNPJ/CPF: ${settings.document}`, settings.phone, settings.email].filter(Boolean).join("  ·  ");
  doc.fillColor(MUTED).font("Helvetica").fontSize(9);
  if (line) doc.text(line);
  if (settings.address) doc.text([settings.address, settings.city].filter(Boolean).join(" — "));
  doc.moveDown(0.5);
  hr(doc);
  doc.moveDown(1).fillColor("#111827");

  await draw(doc);
  doc.end();
  const buf = await done;
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${fileName}.pdf"`, "Cache-Control": "private, no-store" },
  });
}

export function hr(doc: Doc, color = "#e5e7eb") {
  const y = doc.y;
  doc.save().moveTo(doc.page.margins.left, y).lineTo(doc.page.width - doc.page.margins.right, y).lineWidth(1).strokeColor(color).stroke().restore();
}

export function title(doc: Doc, text: string, sub?: string) {
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#111827").text(text, { align: "center" });
  if (sub) doc.font("Helvetica").fontSize(10).fillColor(MUTED).text(sub, { align: "center" });
  doc.moveDown(1.2).fillColor("#111827");
}

export function signature(doc: Doc, label: string, sub?: string) {
  doc.moveDown(4);
  const w = 260;
  const x = (doc.page.width - w) / 2;
  if (doc.y > doc.page.height - 120) doc.addPage();
  const y = doc.y;
  doc.save().moveTo(x, y).lineTo(x + w, y).lineWidth(0.8).strokeColor("#111827").stroke().restore();
  doc.moveDown(0.3).font("Helvetica").fontSize(10).text(label, x, doc.y, { width: w, align: "center" });
  if (sub) doc.fontSize(9).fillColor(MUTED).text(sub, x, doc.y, { width: w, align: "center" }).fillColor("#111827");
  doc.x = doc.page.margins.left;
}

/** Tabela simples: colunas com largura e alinhamento */
export function table(doc: Doc, cols: { label: string; width: number; align?: "left" | "right" | "center" }[], rows: string[][]) {
  const left = doc.page.margins.left;
  const drawRow = (cells: string[], bold = false) => {
    if (doc.y > doc.page.height - 100) doc.addPage();
    const y = doc.y;
    let x = left;
    let maxH = 0;
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 9 : 10).fillColor(bold ? MUTED : "#111827");
    cells.forEach((c, i) => {
      const h = doc.heightOfString(c, { width: cols[i].width - 6 });
      maxH = Math.max(maxH, h);
      doc.text(c, x + 3, y, { width: cols[i].width - 6, align: cols[i].align ?? "left" });
      x += cols[i].width;
    });
    doc.x = left;
    doc.y = y + maxH + 6;
    hr(doc);
    doc.y += 6;
  };
  drawRow(cols.map((c) => c.label), true);
  rows.forEach((r) => drawRow(r));
  doc.fillColor("#111827");
}
