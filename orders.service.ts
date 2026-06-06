import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrdersQueryDto } from './dto/orders-query.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Créer une commande ────────────────────────────────────
  async create(dto: CreateOrderDto, userId: string) {
    // Vérifier client
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
    });
    if (!client) {
      throw new NotFoundException({
        message: 'Client introuvable',
        messageAr: 'العميل غير موجود',
      });
    }

    if (!client.isValidated) {
      throw new BadRequestException({
        message: 'Client non validé. Impossible de créer une commande.',
        messageAr: 'العميل غير موثّق. لا يمكن إنشاء طلب.',
      });
    }

    // Vérifier disponibilité de chaque produit
    for (const item of dto.items) {
      const stock = await this.prisma.stock.findUnique({
        where: { productId: item.productId },
        include: { product: { select: { nameFr: true, sku: true } } },
      });

      if (!stock) {
        throw new NotFoundException({
          message: `Produit ${item.productId} introuvable`,
          messageAr: 'المنتج غير موجود',
        });
      }

      const available = stock.quantityAvailable - stock.quantityReserved;
      if (available < item.quantity) {
        throw new BadRequestException({
          message: `Stock insuffisant pour ${stock.product.nameFr} (${stock.product.sku}). Disponible: ${available}`,
          messageAr: `المخزون غير كافٍ للمنتج. المتاح: ${available}`,
        });
      }
    }

    // Créer la commande dans une transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // Créer la commande (order_number généré par trigger)
      const newOrder = await tx.order.create({
        data: {
          orderNumber: '',
          clientId: dto.clientId,
          status: 'draft',
          paymentMethod: dto.paymentMethod as any,
          notes: dto.notes,
          notesAr: dto.notesAr,
          shippingAddress: dto.shippingAddress,
          timbreFiscal: 50,
          createdBy: userId,
        },
      });

      // Ajouter les lignes de commande
      for (const item of dto.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) continue;

        const unitPrice = item.useWholesalePrice
          ? Number(product.wholesalePrice)
          : Number(product.sellingPrice);

        const profitPerUnit = unitPrice - Number(product.purchasePrice);
        const lineQty = item.quantity;
        const discountPct = item.discountPercent ?? 0;
        const profitAmount = profitPerUnit * lineQty * (1 - discountPct / 100);

        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPriceHt: unitPrice,
            discountPercent: discountPct,
            tvaRate: Number(product.tvaRate),
            profitAmount,
          },
        });
      }

      // Récupérer la commande complète avec totaux recalculés
      return tx.order.findUnique({
        where: { id: newOrder.id },
        include: {
          items: {
            include: {
              product: { select: { id: true, sku: true, nameFr: true, nameAr: true, tvaRate: true } },
            },
          },
          client: { select: { id: true, companyName: true, companyNameAr: true } },
        },
      });
    });

    return order;
  }

  // ── Liste commandes ───────────────────────────────────────
  async findAll(query: OrdersQueryDto, userId: string, userRole: string) {
    const { page = 1, limit = 20, status, clientId, dateFrom, dateTo, paymentStatus } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Les clients ne voient que leurs propres commandes
    if (userRole === 'client') {
      const clientRecord = await this.prisma.client.findFirst({
        where: { userId },
      });
      if (clientRecord) where.clientId = clientRecord.id;
      else return { items: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }

    if (status) where.status = status;
    if (clientId && userRole !== 'client') where.clientId = clientId;
    if (paymentStatus) where.paymentStatus = paymentStatus;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, companyName: true, companyNameAr: true, wilayaCode: true } },
          creator: { select: { id: true, fullName: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Détail commande ───────────────────────────────────────
  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true, sku: true, nameFr: true, nameAr: true,
                brand: true, unitOfMeasure: true, tvaRate: true,
              },
            },
          },
        },
        client: true,
        creator: { select: { id: true, fullName: true, fullNameAr: true } },
        invoices: { select: { id: true, invoiceNumber: true, status: true, totalTtc: true } },
      },
    });

    if (!order) {
      throw new NotFoundException({
        message: 'Commande introuvable',
        messageAr: 'الطلب غير موجود',
      });
    }

    // Calcul détaillé TVA algérienne
    const tvaBreakdown = this.calculateTvaBreakdown(order.items as any);

    return { ...order, tvaBreakdown };
  }

  // ── Mettre à jour statut ──────────────────────────────────
  async updateStatus(id: string, status: string, userId: string) {
    const order = await this.findOne(id);

    const validTransitions: Record<string, string[]> = {
      draft: ['pending', 'cancelled'],
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered', 'returned'],
      delivered: ['returned'],
      cancelled: [],
      returned: [],
    };

    const allowed = validTransitions[order.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException({
        message: `Transition invalide: ${order.status} → ${status}`,
        messageAr: `الانتقال غير صالح: ${order.status} → ${status}`,
      });
    }

    const data: any = { status };
    if (status === 'delivered') data.deliveredAt = new Date();

    // Libérer le stock si annulé
    if (status === 'cancelled' && ['confirmed', 'processing'].includes(order.status)) {
      for (const item of order.items) {
        await this.prisma.stock.update({
          where: { productId: (item as any).productId },
          data: {
            quantityReserved: { decrement: (item as any).quantity },
          },
        });
      }
    }

    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'order_status_change',
        resourceType: 'order',
        resourceId: id,
        metadata: { from: order.status, to: status },
      },
    });

    return this.prisma.order.update({
      where: { id },
      data,
      include: {
        client: { select: { id: true, companyName: true } },
        items: true,
      },
    });
  }

  // ── Supprimer (brouillon uniquement) ──────────────────────
  async remove(id: string) {
    const order = await this.findOne(id);
    if (order.status !== 'draft') {
      throw new BadRequestException({
        message: 'Seuls les brouillons peuvent être supprimés',
        messageAr: 'يمكن حذف المسودات فقط',
      });
    }
    return this.prisma.order.delete({ where: { id } });
  }

  // ── Calcul TVA algérienne ─────────────────────────────────
  private calculateTvaBreakdown(items: any[]) {
    const breakdown: Record<string, { baseHt: number; tvaAmount: number }> = {};

    for (const item of items) {
      const rate = String(item.tvaRate);
      const lineHt = Number(item.lineTotal_ht ?? item.quantity * Number(item.unitPriceHt) * (1 - Number(item.discountPercent) / 100));
      const tvAmt = lineHt * (Number(item.tvaRate) / 100);

      if (!breakdown[rate]) breakdown[rate] = { baseHt: 0, tvaAmount: 0 };
      breakdown[rate].baseHt += lineHt;
      breakdown[rate].tvaAmount += tvAmt;
    }

    return Object.entries(breakdown).map(([rate, values]) => ({
      tvaRate: parseFloat(rate),
      baseHt: Math.round(values.baseHt * 100) / 100,
      tvaAmount: Math.round(values.tvaAmount * 100) / 100,
    }));
  }
}
