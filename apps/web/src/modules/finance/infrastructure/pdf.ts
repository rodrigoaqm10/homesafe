import 'server-only';
import PDFDocument from 'pdfkit';
export async function financePdf(
  title: string,
  subtitle: string,
  sections: { title: string; rows: string[] }[],
) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 48,
    info: { Title: title, Author: 'Home Safe' },
  });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.once('end', () => resolve(Buffer.concat(chunks)));
    doc.once('error', reject);
  });
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#416166')
    .text('HOME SAFE');
  doc.moveDown().fontSize(23).fillColor('#183139').text(title);
  doc.moveDown(0.45).font('Helvetica').fontSize(11).text(subtitle).moveDown();
  for (const section of sections) {
    if (doc.y > doc.page.height - 130) doc.addPage();
    doc.font('Helvetica-Bold').fontSize(14).text(section.title).moveDown(0.35);
    doc.font('Helvetica').fontSize(10);
    for (const row of section.rows)
      doc.text(row, { lineGap: 2 }).moveDown(0.45);
    if (!section.rows.length) doc.text('Sin registros.');
    doc.moveDown();
  }
  doc.end();
  return done;
}
export function financeDownload(
  bytes: Uint8Array,
  filename: string,
  type: string,
) {
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': type,
      'Content-Disposition': 'attachment; filename="' + filename + '"',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
