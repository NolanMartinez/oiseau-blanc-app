import PDFDocument from 'pdfkit';
import type { DailyReportSite } from './email.service';

// Génère le PDF du rapport quotidien : une section par site, avec le détail
// par produit (vendus + CA) et les produits à retirer (DLC). Renvoie le PDF
// complet en mémoire (Buffer) pour l'attacher à l'email de 03:00.

const BRAND = '#319966';
const INK = '#111827';
const SOFT = '#6b7280';
const LINE = '#e5e7eb';

const eur = (cents: number) =>
  (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

export function buildDailyReportPdf(data: {
  dateLabel: string;
  sites: DailyReportSite[];
  totalCount: number;
  totalRevenueCents: number;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;

    // En-tête
    doc.fillColor(BRAND).fontSize(24).font('Helvetica-Bold').text('Friggo', left, 44);
    doc.fillColor(INK).fontSize(15).font('Helvetica-Bold').text('Rapport quotidien — tournée du jour', left, 74);
    doc.fillColor(SOFT).fontSize(10).font('Helvetica').text(`Période : ${data.dateLabel}`, left, 96);
    doc.fillColor(INK).fontSize(11).font('Helvetica-Bold')
      .text(`Total : ${data.totalCount} vente${data.totalCount > 1 ? 's' : ''} · ${eur(data.totalRevenueCents)}`, left, 114);
    doc.moveTo(left, 134).lineTo(right, 134).strokeColor(LINE).stroke();
    doc.y = 148;

    const ensureSpace = (needed: number) => {
      if (doc.y + needed > doc.page.height - doc.page.margins.bottom) doc.addPage();
    };

    // Ligne de tableau à 3 colonnes (produit / quantité / montant).
    const cols = { name: left, qty: left + width * 0.62, amount: right };
    const row = (c1: string, c2: string, c3: string, bold = false, color = INK) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5).fillColor(color);
      const y = doc.y;
      doc.text(c1, cols.name, y, { width: width * 0.6, ellipsis: true });
      doc.text(c2, cols.qty, y, { width: width * 0.16, align: 'center' });
      doc.text(c3, cols.name, y, { width, align: 'right' });
      doc.y = y + 15;
    };

    if (data.sites.length === 0) {
      doc.fillColor(SOFT).fontSize(11).font('Helvetica').text('Aucune activité sur cette période.', left, doc.y + 10);
    }

    for (const s of data.sites) {
      ensureSpace(90);
      doc.moveDown(0.4);
      const machinesLbl = s.machines.length > 1 ? `  (${s.machines.length} machines)` : (s.machines[0] ? `  (${s.machines[0]})` : '');
      doc.fillColor(INK).fontSize(13).font('Helvetica-Bold').text(s.site, left, doc.y, { continued: true });
      doc.fillColor(SOFT).fontSize(10).font('Helvetica').text(machinesLbl);
      doc.fillColor(BRAND).fontSize(11).font('Helvetica-Bold')
        .text(`${s.count} vente${s.count > 1 ? 's' : ''} · ${eur(s.revenueCents)}`, left, doc.y + 2);
      doc.moveDown(0.5);

      // Détail par produit
      doc.fillColor(SOFT).fontSize(9).font('Helvetica-Bold').text('DÉTAIL PAR PRODUIT', left, doc.y);
      doc.y += 4;
      row('Produit', 'Vendus', 'CA', true, SOFT);
      doc.moveTo(left, doc.y - 2).lineTo(right, doc.y - 2).strokeColor(LINE).stroke();
      if (s.products.length === 0) {
        doc.fillColor(SOFT).fontSize(9).font('Helvetica').text('Aucune vente.', left, doc.y);
        doc.y += 14;
      } else {
        for (const p of s.products) {
          ensureSpace(18);
          row(p.name, String(p.quantity), eur(p.revenueCents));
        }
      }

      // Produits à retirer (DLC)
      doc.moveDown(0.3);
      ensureSpace(40);
      doc.fillColor('#b91c1c').fontSize(9).font('Helvetica-Bold')
        .text(`À RETIRER (${s.toRemove.length})`, left, doc.y);
      doc.y += 4;
      if (s.toRemove.length === 0) {
        doc.fillColor(SOFT).fontSize(9).font('Helvetica').text('Rien à retirer.', left, doc.y);
        doc.y += 14;
      } else {
        for (const r of s.toRemove) {
          ensureSpace(16);
          const y = doc.y;
          doc.font('Helvetica').fontSize(9.5).fillColor(INK)
            .text(r.dishName, cols.name, y, { width: width * 0.6, ellipsis: true });
          doc.text(String(r.quantity), cols.qty, y, { width: width * 0.16, align: 'center' });
          doc.fillColor(SOFT).text(`${r.expiry}${r.machine ? ' · ' + r.machine : ''}`, cols.name, y, { width, align: 'right' });
          doc.y = y + 15;
        }
      }

      doc.moveDown(0.5);
      doc.moveTo(left, doc.y).lineTo(right, doc.y).strokeColor(LINE).dash(2, { space: 2 }).stroke().undash();
      doc.moveDown(0.5);
    }

    doc.end();
  });
}
