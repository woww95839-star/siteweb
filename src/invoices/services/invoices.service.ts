import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { PdfGeneratorService } from './pdf-generator.service';
import { ConfigService } from '@nestjs/config';
import { Invoice, InvoiceCalculations, InvoiceLineItem, InvoiceType, InvoiceStatus } from '../types/invoice.types';
import * as crypto from 'crypto';
import * as archiver from 'archiver';
import * as streamBuffers from 'stream-buffers';

@Injectable()
export class InvoicesService {
  private readonly timbreFiscal: number;

  constructor(
    private prisma: PrismaService,
    private pdfGenerator: PdfGeneratorService,
    private config: ConfigService,
  ) {
    this.timbreFiscal = Number(this.config.get('TIMBRE_FISCAL', 50));
  }

  // Génère un numéro de facture unique: FAC-YYYY-0001 (reset annuel)
  private async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);

    const count = await this.prisma.invoice.count({
      where: { issuedAt: { gte: start, lt: end } },
    });

    const seq = (count + 1).toString().padStart(4, '0');
    return `FAC-${year}-${seq}`;
  }

  // Calculs: totaux HT, remises, TVA par taux, timbre, total TTC
  private calculateTotals(lineItems: any[], globalDiscountPercent = 0): InvoiceCalculations {
    let tva0_base = 0;
    let tva9_base = 0;
    let tva19_base = 0;

    let totalBaseHT = 0;
    let lineDiscountsTotal = 0;

    for (const it of lineItems) {
      const qty = Number(it.quantity || 0);
      const price = Number(it.priceHT || it.unitPriceHt || 0);
      const discountPct = Number(it.discount ?? it.discountPercent ?? 0);
      const lineHt = qty * price * (1 - discountPct / 100);
      totalBaseHT += lineHt;
      lineDiscountsTotal += qty * price * (discountPct / 100);

      const rate = Number(it.tvaRate ?? it.tva || 19) as any;
      if (rate === 0) tva0_base += lineHt;
      else if (rate === 9) tva9_base += lineHt;
      else tva19_base += lineHt;
    }

    const globalDiscountAmount = (totalBaseHT * (globalDiscountPercent || 0)) / 100;
    const totalDiscount = lineDiscountsTotal + globalDiscountAmount;

    const tva0_amount = (tva0_base * 0) / 100;
    const tva9_amount = (tva9_base * 9) / 100;
    const tva19_amount = (tva19_base * 19) / 100;
    const totalTVA = tva0_amount + tva9_amount + tva19_amount;

    const totalTTC = totalBaseHT - globalDiscountAmount + totalTVA + this.timbreFiscal;

    const calc: InvoiceCalculations = {
      tva0_baseHT: Math.round(tva0_base * 100) / 100,
      tva9_baseHT: Math.round(tva9_base * 100) / 100,
      tva19_baseHT: Math.round(tva19_base * 100) / 100,
      totalBaseHT: Math.round(totalBaseHT * 100) / 100,
      lineDiscountsTotal: Math.round(lineDiscountsTotal * 100) / 100,
      globalDiscount: Math.round(globalDiscountAmount * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      tva0_amount: Math.round(tva0_amount * 100) / 100,
      tva9_amount: Math.round(tva9_amount * 100) / 100,
      tva19_amount: Math.round(tva19_amount * 100) / 100,
      totalTVA: Math.round(totalTVA * 100) / 100,
      timbreFiscal: this.timbreFiscal,
      totalTTC: Math.round(totalTTC * 100) / 100,
      totalTTCInLetters: this.numberToWordsFR(Math.round(totalTTC)),
    } as InvoiceCalculations;

    return calc;
  }

  // Simple conversion du nombre en texte en français (placeholder pour arabe)
  private numberToWordsFR(n: number): string {
    // For production replace with a robust library (e.g., french-number-to-words)
    if (n === 0) return 'zéro dinars algériens';
    return `${n.toLocaleString('fr-FR')} DZD`;
  }

  // Créer facture et items en BD, générer PDF et retourner facture
  async createInvoice(dto: CreateInvoiceDto, userId: string, generatePdf = true) {
    // Vérifier client
    const client = await this.prisma.client.findUnique({ where: { id: dto.clientId } });
    if (!client) throw new NotFoundException({ message: 'Client introuvable', messageAr: 'العميل غير موجود' });

    // Ownership: si le client est lié à un user, on vérifie
    if (client.userId && client.userId !== userId) {
      throw new ForbiddenException({ message: 'Accès non autorisé au client', messageAr: 'وصول غير مصرح به' });
    }

    const invoiceNumber = await this.generateInvoiceNumber();
    const issuedAt = new Date();

    // Préparer items pour stockage
    const itemsForDb = dto.lineItems.map((li) => ({
      productId: li.productId,
      designationFr: li.designation,
      designationAr: li.designationAr || '',
      reference: li.reference || null,
      unit: li.unit || null,
      quantity: li.quantity,
      unitPriceHt: li.priceHT,
      discountPercent: li.discount || 0,
      tvaRate: li.tvaRate ?? 19,
    }));

    const calculations = this.calculateTotals(itemsForDb as any[], dto.globalDiscount || 0);

    // Transaction: créer invoice et items
    const created = await this.prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          type: dto.invoiceType || 'INVOICE',
          status: 'DRAFT',
          clientId: dto.clientId,
          issuedAt,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          notes: dto.notes || null,
          notesAr: dto.notesAr || null,
          globalDiscount: dto.globalDiscount || 0,
          timbreFiscal: this.timbreFiscal,
          totalHt: calculations.totalBaseHT,
          totalTva: calculations.totalTVA,
          totalTtc: calculations.totalTTC,
          createdBy: userId,
        },
      });

      // create items
      for (const it of itemsForDb) {
        await tx.invoiceItem.create({
          data: {
            invoiceId: inv.id,
            productId: it.productId,
            designationFr: it.designationFr,
            designationAr: it.designationAr,
            reference: it.reference,
            unit: it.unit,
            quantity: it.quantity,
            unitPriceHt: it.unitPriceHt,
            discountPercent: it.discountPercent,
            tvaRate: it.tvaRate,
            lineTotalHt: Math.round(it.quantity * it.unitPriceHt * (1 - it.discountPercent / 100) * 100) / 100,
          },
        });
      }

      return inv;
    });

    // Recharger invoice complet
    const invoice = await this.findOne(created.id);

    // Générer et stocker PDF si demandé
    let pdfResult = null;
    if (generatePdf) {
      try {
        pdfResult = await this.generatePdf(invoice.id, { includeWatermark: invoice.type === InvoiceType.PROFORMA });
      } catch (e) {
        // Log erreur, mais ne bloque pas la création
        console.warn('PDF generation failed', e);
      }
    }

    return { invoice, pdf: pdfResult };
  }

  // Récupérer facture avec vérification ownership
  async findOne(id: string, user?: any) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        items: true,
        creator: { select: { id: true, email: true, fullName: true } },
      },
    });

    if (!invoice) throw new NotFoundException({ message: 'Facture introuvable', messageAr: 'الفاتورة غير موجودة' });

    // Ownership check: si client lié à user et user provided
    if (user && invoice.client?.userId && invoice.client.userId !== user.sub) {
      throw new ForbiddenException({ message: 'Accès non autorisé', messageAr: 'وصول غير مصرح به' });
    }

    // Calculs détaillés
    const calc = this.calculateTotals(
      invoice.items.map((it) => ({ quantity: it.quantity, priceHT: it.unitPriceHt ?? it.unitPrice, discount: it.discountPercent, tvaRate: it.tvaRate })),
      invoice.globalDiscount || 0,
    );

    const result: Invoice = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      type: invoice.type as InvoiceType,
      status: invoice.status as InvoiceStatus,
      issuedAt: invoice.issuedAt,
      dueDate: invoice.dueDate ?? undefined,
      paidAt: invoice.paidAt ?? undefined,
      company: {
        id: 'company-1',
        nameFr: this.config.get('COMPANY_NAME', 'SokPlus SARL'),
        nameAr: this.config.get('COMPANY_NAME_AR', ''),
        nif: this.config.get('COMPANY_NIF', ''),
        nis: this.config.get('COMPANY_NIS', ''),
        rc: this.config.get('COMPANY_RC', ''),
        ai: this.config.get('COMPANY_AI', ''),
        address: this.config.get('COMPANY_ADDRESS', ''),
        wilayaCode: Number(this.config.get('COMPANY_WILAYA', 16)),
        phone: this.config.get('COMPANY_PHONE', ''),
      },
      client: {
        id: invoice.client.id,
        companyNameFr: invoice.client.companyName,
        companyNameAr: invoice.client.companyNameAr || '',
        nif: invoice.client.nif || '',
        nis: invoice.client.nis || '',
        address: invoice.client.address || '',
        wilayaCode: invoice.client.wilayaCode ?? 0,
      },
      lineItems: invoice.items.map((it) => ({
        productId: it.productId,
        designationFr: it.designationFr,
        designationAr: it.designationAr,
        reference: it.reference || '',
        unit: it.unit || '',
        quantity: it.quantity,
        priceHT: Number(it.unitPriceHt ?? 0),
        discountPercent: Number(it.discountPercent ?? 0),
        tvaRate: Number(it.tvaRate ?? 19) as any,
        lineTotal_ht: Number(it.lineTotalHt ?? 0),
        lineTotal_ttc: 0,
      } as InvoiceLineItem)),
      globalDiscount: invoice.globalDiscount ?? 0,
      notes: invoice.notes ?? undefined,
      notesAr: invoice.notesAr ?? undefined,
      paymentTerms: invoice.paymentTerms ?? undefined,
      purchaseOrderNumber: invoice.purchaseOrderNumber ?? undefined,
      calculations: calc,
      paymentMethod: invoice.paymentMethod ?? undefined,
      totalPaid: invoice.totalPaid ?? undefined,
      createdBy: invoice.createdBy,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      orderId: invoice.orderId ?? undefined,
    };

    return result;
  }

  // Liste factures (pagination + filtres)
  async findAll(params: { page?: number; limit?: number; clientId?: string; status?: string; dateFrom?: string; dateTo?: string; search?: string }, user?: any) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.clientId) where.clientId = params.clientId;
    if (params.status) where.status = params.status;
    if (params.dateFrom || params.dateTo) {
      where.issuedAt = {};
      if (params.dateFrom) where.issuedAt.gte = new Date(params.dateFrom);
      if (params.dateTo) where.issuedAt.lte = new Date(params.dateTo);
    }
    if (params.search) {
      where.OR = [{ invoiceNumber: { contains: params.search } }, { notes: { contains: params.search } }];
    }

    // If user is client, restrict to their client record
    if (user?.role === 'client') {
      const client = await this.prisma.client.findFirst({ where: { userId: user.sub } });
      if (client) where.clientId = client.id; else return { items: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({ where, skip, take: limit, orderBy: { issuedAt: 'desc' }, include: { client: true } }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // Changer statut facture
  async changeStatus(id: string, newStatus: InvoiceStatus | string, userId: string) {
    const inv = await this.prisma.invoice.findUnique({ where: { id } });
    if (!inv) throw new NotFoundException();

    const validTransitions: Record<string, string[]> = {
      DRAFT: ['ISSUED', 'CANCELLED'],
      ISSUED: ['PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED'],
      PARTIAL: ['PAID', 'OVERDUE', 'CANCELLED'],
      PAID: [],
      OVERDUE: ['PAID', 'CANCELLED'],
      CANCELLED: [],
    };

    const allowed = validTransitions[inv.status] ?? [];
    if (!allowed.includes(String(newStatus))) {
      throw new BadRequestException({ message: `Transition invalide: ${inv.status} → ${newStatus}` });
    }

    const data: any = { status: newStatus };
    if (String(newStatus) === 'PAID') data.paidAt = new Date();

    const updated = await this.prisma.invoice.update({ where: { id }, data });

    await this.prisma.activityLog.create({ data: { userId, action: 'invoice_status_change', resourceType: 'invoice', resourceId: id, metadata: { from: inv.status, to: newStatus } } });

    return updated;
  }

  // Génère le PDF pour une facture (wrapper)
  async generatePdf(id: string, options?: any) {
    const invoice = await this.findOne(id);
    if (!invoice) throw new NotFoundException();

    const pdf = await this.pdfGenerator.generateInvoicePdf(invoice, options);
    return pdf;
  }

  // Génération bulk ZIP
  async bulkGeneratePdf(ids: string[]) {
    const buffers = [] as { filename: string; buffer: Buffer }[];
    for (const id of ids) {
      try {
        const pdf = await this.generatePdf(id);
        buffers.push({ filename: `${id}.pdf`, buffer: pdf.buffer });
      } catch (e) {
        // skip missing
      }
    }

    // Create zip
    const archive = archiver('zip', { zlib: { level: 9 } });
    const writableBuffer = new streamBuffers.WritableStreamBuffer({ initialSize: 1024 * 1024, incrementAmount: 1024 * 1024 });
    archive.pipe(writableBuffer);

    for (const b of buffers) {
      archive.append(b.buffer, { name: b.filename });
    }

    await archive.finalize();

    const zipBuffer = writableBuffer.getContents() as Buffer;
    return { buffer: zipBuffer, filename: `invoices_${Date.now()}.zip`, size: zipBuffer.length };
  }
}
