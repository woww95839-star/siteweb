import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import { Invoice, PDFGenerationOptions, PDFGenerationResult, CompanyInfo, InvoiceCalculations, InvoiceLineItem, TVARate } from '../types/invoice.types';

/**
 * Service responsable de la génération PDF bilingue (FR/AR) des factures.
 * - Utilise PDFKit
 * - Police Amiri pour l'arabe (si fournie dans assets/fonts/Amiri-Regular.ttf)
 * - Helvetica/Helvetica-Bold pour le français
 * - Génère QR Code (num facture | montant | NIF)
 * - Watermark PROFORMA pour devis
 */
@Injectable()
export class PdfGeneratorService {
  private storagePath: string;
  private timbreFiscal: number;
  private amiriFontPath: string;

  constructor(private config: ConfigService) {
    this.storagePath = this.config.get('PDF_STORAGE_PATH', './storage/invoices');
    this.timbreFiscal = Number(this.config.get('TIMBRE_FISCAL', 50));
    this.amiriFontPath = path.resolve(process.cwd(), 'assets', 'fonts', 'Amiri-Regular.ttf');
    this.ensureStorage();
  }

  private ensureStorage() {
    if (!fs.existsSync(this.storagePath)) fs.mkdirSync(this.storagePath, { recursive: true });
  }

  /**
   * Génère le PDF en mémoire et retourne le buffer + meta
   */
  async generateInvoicePdf(invoice: Invoice, options?: PDFGenerationOptions): Promise<PDFGenerationResult> {
    const opts: PDFGenerationOptions = Object.assign({ includeQRCode: true, includeWatermark: invoice.type === 'PROFORMA', compress: true, language: 'bilingual' }, options || {});

    const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 60, left: 40, right: 40 }, bufferPages: true });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    // Fonts
    const hasAmiri = fs.existsSync(this.amiriFontPath);
    if (hasAmiri) {
      try { doc.registerFont('Amiri', this.amiriFontPath); } catch (e) { /* continue */ }
    }

    // Render header
    this.renderHeader(doc, invoice.company);

    // Invoice meta (number, dates)
    this.renderInvoiceMeta(doc, invoice);

    // Client info block
    this.renderClientBlock(doc, invoice.client);

    // Line items table
    this.renderLineItemsTable(doc, invoice.lineItems);

    // Totals
    this.renderTotals(doc, invoice.calculations);

    // QR Code
    if (opts.includeQRCode) {
      await this.addQRCode(doc, invoice.invoiceNumber, invoice.calculations.totalTTC, invoice.company.nif);
    }

    // Footer
    this.renderFooter(doc, invoice);

    // Watermark (if PROFORMA or option)
    if (opts.includeWatermark) {
      this.addWatermark(doc, 'PROFORMA');
    }

    doc.end();

    return new Promise<PDFGenerationResult>((resolve, reject) => {
      doc.on('finish', () => {
        const buffer = Buffer.concat(chunks);
        const filename = `${invoice.invoiceNumber || invoice.id}.pdf`;
        const result: PDFGenerationResult = {
          buffer,
          filename,
          mimeType: 'application/pdf',
          size: buffer.length,
          generatedAt: new Date(),
        };

        // Optionally persist to disk
        try {
          const outPath = path.join(this.storagePath, filename);
          fs.writeFileSync(outPath, buffer);
        } catch (err) {
          // ignore write errors for now
        }

        resolve(result);
      });
      doc.on('error', (err) => reject(err));
    });
  }

  private renderHeader(doc: PDFKit.PDFDocument, company: CompanyInfo) {
    // Left: logo (if exists)
    const startY = 40;
    const leftX = 40;
    const rightX = doc.page.width - 40;

    // Logo placeholder
    if (company.logo && fs.existsSync(company.logo)) {
      try { doc.image(company.logo, leftX, startY, { width: 80 }); } catch (e) { /* ignore */ }
    }

    // Company FR
    doc.font('Helvetica-Bold').fontSize(14).text(company.nameFr, leftX + 100, startY);
    doc.font('Helvetica').fontSize(9).text(company.address, leftX + 100, startY + 20);
    doc.text(`Wilaya: ${company.wilayaCode}`, leftX + 100, startY + 35);

    // Fiscal info
    doc.fontSize(9).text(`NIF : ${company.nif} | NIS : ${company.nis}`, leftX + 100, startY + 50);
    doc.text(`RC : ${company.rc} | AI : ${company.ai}`, leftX + 100, startY + 65);
    doc.text(`Tél : ${company.phone}`, leftX + 100, startY + 80);

    // Arabic name on the right (RTL)
    const arName = company.nameAr || '';
    const arAddress = company.address || '';

    // Use Amiri if available
    if (fs.existsSync(this.amiriFontPath)) {
      try { doc.font('Amiri'); } catch (e) { doc.font('Helvetica'); }
    }

    const arabicX = rightX - 250;
    doc.fontSize(12).text(arName, arabicX, startY, { width: 250, align: 'right' });
    doc.fontSize(9).text(arAddress, arabicX, startY + 20, { width: 250, align: 'right' });
    doc.fontSize(9).text(`NIF : ${company.nif}`, arabicX, startY + 40, { width: 250, align: 'right' });

    // reset font
    doc.font('Helvetica');

    // Horizontal line
    doc.moveTo(40, startY + 100).lineTo(doc.page.width - 40, startY + 100).stroke();
  }

  private renderInvoiceMeta(doc: PDFKit.PDFDocument, invoice: Invoice) {
    const y = 150;
    const leftX = 40;
    const rightX = doc.page.width - 40;

    doc.font('Helvetica-Bold').fontSize(12).text('FACTURE N° :', leftX, y);
    doc.font('Helvetica').fontSize(12).text(invoice.invoiceNumber || invoice.id, leftX + 90, y);

    // Arabic
    if (fs.existsSync(this.amiriFontPath)) doc.font('Amiri');
    doc.fontSize(11).text('فاتورة رقم :', rightX - 150, y, { align: 'right' });
    doc.text(invoice.invoiceNumber || invoice.id, rightX - 70, y, { align: 'right' });
    doc.font('Helvetica');

    // Dates
    const issued = this.formatDate(invoice.issuedAt);
    const issuedAr = this.formatDateAR(invoice.issuedAt);
    doc.fontSize(10).text(`Date : ${issued}`, leftX, y + 20);
    doc.fontSize(10).text(`التاريخ : ${issuedAr}`, rightX - 200, y + 20, { align: 'right' });

    if (invoice.dueDate) {
      const due = this.formatDate(invoice.dueDate);
      const dueAr = this.formatDateAR(invoice.dueDate);
      doc.text(`Échéance : ${due}`, leftX, y + 35);
      doc.text(`تاريخ الاستحقاق : ${dueAr}`, rightX - 200, y + 35, { align: 'right' });
    }

    doc.moveDown();
  }

  private renderClientBlock(doc: PDFKit.PDFDocument, client: any) {
    const y = 210;
    const leftX = 40;

    doc.font('Helvetica-Bold').fontSize(11).text('INFORMATIONS CLIENT', leftX, y);
    doc.font('Helvetica').fontSize(9).text(client.companyNameFr || client.companyName || '', leftX, y + 18);
    if (fs.existsSync(this.amiriFontPath)) doc.font('Amiri');
    doc.fontSize(9).text(client.companyNameAr || '', leftX, y + 34);
    doc.font('Helvetica').fontSize(9).text(`NIF : ${client.nif}`, leftX, y + 50);
    doc.text(`Adresse : ${client.address}`, leftX, y + 65);

    if (fs.existsSync(this.amiriFontPath)) doc.font('Helvetica');

    // small separator
    doc.moveTo(leftX, y + 90).lineTo(doc.page.width - 40, y + 90).stroke();
  }

  private renderLineItemsTable(doc: PDFKit.PDFDocument, items: InvoiceLineItem[]) {
    const startY = 310;
    const tableWidth = doc.page.width - 80;
    const col = {
      no: 30,
      designation: 180,
      ref: 60,
      unit: 40,
      qty: 40,
      price: 70,
      discount: 50,
      total: 100,
    };

    // Header background
    doc.rect(40, startY, tableWidth, 20).fill('#f2f2f2');
    doc.fill('#000').font('Helvetica-Bold').fontSize(9);

    let x = 40;
    doc.text('N°', x + 4, startY + 5, { width: col.no });
    x += col.no;
    doc.text('Désignation', x + 4, startY + 5, { width: col.designation });
    x += col.designation;
    doc.text('Réf.', x + 4, startY + 5, { width: col.ref });
    x += col.ref;
    doc.text('U', x + 4, startY + 5, { width: col.unit });
    x += col.unit;
    doc.text('Qté', x + 4, startY + 5, { width: col.qty });
    x += col.qty;
    doc.text('Prix HT', x + 4, startY + 5, { width: col.price });
    x += col.price;
    doc.text('Remise %', x + 4, startY + 5, { width: col.discount });
    x += col.discount;
    doc.text('Total HT', x + 4, startY + 5, { width: col.total });

    // Rows
    doc.font('Helvetica').fontSize(9);
    let y = startY + 20;
    items.forEach((it, idx) => {
      const isEven = idx % 2 === 0;
      if (isEven) {
        doc.rect(40, y, tableWidth, 18).fill('#fbfbfb');
        doc.fill('#000');
      }

      let cx = 40;
      const lineTotal = (it.quantity * it.priceHT) * (1 - (it.discountPercent || 0) / 100);
      doc.text(String(idx + 1), cx + 4, y + 4, { width: col.no });
      cx += col.no;
      doc.text(it.designationFr, cx + 4, y + 4, { width: col.designation });
      cx += col.designation;
      doc.text(it.reference || '', cx + 4, y + 4, { width: col.ref });
      cx += col.ref;
      doc.text(it.unit || '', cx + 4, y + 4, { width: col.unit });
      cx += col.unit;
      doc.text(String(it.quantity), cx + 4, y + 4, { width: col.qty });
      cx += col.qty;
      doc.text(it.priceHT.toFixed(2), cx + 4, y + 4, { width: col.price });
      cx += col.price;
      doc.text(String(it.discountPercent || 0), cx + 4, y + 4, { width: col.discount });
      cx += col.discount;
      doc.text(lineTotal.toFixed(2), cx + 4, y + 4, { width: col.total, align: 'right' });

      y += 18;
      // Page break if needed
      if (y > doc.page.height - 150) {
        doc.addPage();
        y = 60;
      }
    });
  }

  private renderTotals(doc: PDFKit.PDFDocument, calc: InvoiceCalculations) {
    const rightX = doc.page.width - 40;
    let y = doc.page.height - 200;

    const labelWidth = 220;
    const valueWidth = 100;

    doc.font('Helvetica').fontSize(10);

    doc.text('Montant HT', rightX - labelWidth - valueWidth, y, { width: labelWidth, align: 'right' });
    doc.text(calc.totalBaseHT.toFixed(2) + ' DZD', rightX - valueWidth, y, { width: valueWidth, align: 'right' });
    y += 16;

    if (calc.totalDiscount > 0) {
      doc.text('Remise globale', rightX - labelWidth - valueWidth, y, { width: labelWidth, align: 'right' });
      doc.text('-' + calc.totalDiscount.toFixed(2) + ' DZD', rightX - valueWidth, y, { width: valueWidth, align: 'right' });
      y += 16;
    }

    doc.text('TVA (19%)', rightX - labelWidth - valueWidth, y, { width: labelWidth, align: 'right' });
    doc.text(calc.totalTVA.toFixed(2) + ' DZD', rightX - valueWidth, y, { width: valueWidth, align: 'right' });
    y += 16;

    doc.text('Timbre fiscal', rightX - labelWidth - valueWidth, y, { width: labelWidth, align: 'right' });
    doc.text(this.timbreFiscal.toFixed(2) + ' DZD', rightX - valueWidth, y, { width: valueWidth, align: 'right' });
    y += 18;

    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('TOTAL TTC', rightX - labelWidth - valueWidth, y, { width: labelWidth, align: 'right' });
    doc.text(calc.totalTTC.toFixed(2) + ' DZD', rightX - valueWidth, y, { width: valueWidth, align: 'right' });
    y += 20;

    // Montant en lettres (français + arabe placeholder)
    doc.font('Helvetica').fontSize(9).text('Arrêtée la présente facture à la somme de : ' + (calc.totalTTCInLetters || ''), 40, y, { width: 400 });
  }

  private async addQRCode(doc: PDFKit.PDFDocument, invoiceNumber: string, total: number, nif: string) {
    try {
      const data = `${invoiceNumber}|${total.toFixed(2)}|${nif}`;
      const dataUrl = await QRCode.toDataURL(data, { margin: 1, width: 200 });
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
      const img = Buffer.from(base64, 'base64');
      const x = doc.page.width - 120;
      const y = doc.page.height - 320;
      doc.image(img, x, y, { width: 80 });
    } catch (e) {
      // ignore QR errors
    }
  }

  private renderFooter(doc: PDFKit.PDFDocument, invoice: Invoice) {
    const y = doc.page.height - 60;
    doc.font('Helvetica').fontSize(9).text('Merci de votre confiance | شكرا لثقتكم', 40, y);
    // Signature placeholder (left)
    doc.fontSize(8).text('Signature & Cachet:', 40, y + 16);

    // RIB
    doc.fontSize(8).text('RIB: (BNA) 001-2345678-90-01-23', 40, y + 34);
  }

  private addWatermark(doc: PDFKit.PDFDocument, text: string) {
    // Simple watermark: apply on each page
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc.save();
      doc.fontSize(80).fillColor('grey').opacity(0.08).rotate(45, { origin: [doc.page.width / 2, doc.page.height / 2] });
      doc.text(text, doc.page.width / 2 - 150, doc.page.height / 2 - 40, { align: 'center' });
      doc.restore();
    }
  }

  private formatDate(d?: Date) {
    if (!d) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  private formatDateAR(d?: Date) {
    // Simple Arabic-formatted date - could be improved
    return this.formatDate(d);
  }

  // Convertit un nombre en lettres (FR) et retourne aussi placeholder AR
  private convertNumberToLettersFR(amount: number): string {
    // Simplified: use Intl for now then small mapping; production should use library
    try {
      // Convert integer part to words using a simple approach for common amounts
      const formatter = new Intl.NumberFormat('fr-FR');
      return formatter.format(amount) + ' DZD';
    } catch (e) {
      return amount.toFixed(2) + ' DZD';
    }
  }
}
