import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { UpdateStockThresholdDto } from './dto/update-stock-threshold.dto';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Stock d'un produit ────────────────────────────────────
  async getProductStock(productId: string) {
    const stock = await this.prisma.stock.findUnique({
      where: { productId },
      include: {
        product: {
          select: { id: true, sku: true, nameFr: true, nameAr: true, isActive: true },
        },
      },
    });

    if (!stock) {
      throw new NotFoundException({
        message: 'Stock introuvable pour ce produit',
        messageAr: 'لم يتم العثور على مخزون لهذا المنتج',
      });
    }

    return {
      ...stock,
      quantityFree: stock.quantityAvailable - stock.quantityReserved,
      stockStatus: this.getStockStatus(
        stock.quantityAvailable,
        stock.quantityReserved,
        stock.quantityAlertThreshold,
      ),
    };
  }

  // ── Enregistrer un mouvement de stock ─────────────────────
  async recordMovement(dto: CreateStockMovementDto, userId: string) {
    const stock = await this.prisma.stock.findUnique({
      where: { productId: dto.productId },
    });

    if (!stock) {
      throw new NotFoundException({
        message: 'Produit/stock introuvable',
        messageAr: 'المنتج أو المخزون غير موجود',
      });
    }

    // Validation pour mouvements sortants
    if (['out', 'damaged'].includes(dto.movementType)) {
      const available = stock.quantityAvailable - stock.quantityReserved;
      if (Math.abs(dto.quantity) > available) {
        throw new BadRequestException({
          message: `Stock insuffisant. Disponible: ${available}, Demandé: ${Math.abs(dto.quantity)}`,
          messageAr: `المخزون غير كافٍ. المتاح: ${available}، المطلوب: ${Math.abs(dto.quantity)}`,
        });
      }
    }

    const movement = await this.prisma.stockMovement.create({
      data: {
        productId: dto.productId,
        movementType: dto.movementType as any,
        quantity: dto.quantity,
        unitCost: dto.unitCost,
        referenceId: dto.referenceId,
        referenceType: dto.referenceType,
        notes: dto.notes,
        notesAr: dto.notesAr,
        performedBy: userId,
      },
      include: {
        product: { select: { id: true, sku: true, nameFr: true } },
        performer: { select: { id: true, fullName: true } },
      },
    });

    // Vérifier seuil d'alerte après mouvement
    const updatedStock = await this.prisma.stock.findUnique({
      where: { productId: dto.productId },
    });

    if (updatedStock) {
      const free = updatedStock.quantityAvailable - updatedStock.quantityReserved;
      if (free <= updatedStock.quantityAlertThreshold) {
        await this.createStockAlert(dto.productId, free, updatedStock.quantityAlertThreshold);
      }
    }

    return movement;
  }

  // ── Historique mouvements ─────────────────────────────────
  async getMovements(productId?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = productId ? { productId } : {};

    const [items, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, sku: true, nameFr: true, nameAr: true } },
          performer: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Tous les stocks avec alertes ──────────────────────────
  async getAllStock(lowStockOnly = false) {
    const stocks = await this.prisma.$queryRaw<any[]>`
      SELECT
        p.id as product_id,
        p.sku,
        p.name_fr,
        p.name_ar,
        p.brand,
        c.name_fr as category_name,
        s.id as stock_id,
        s.quantity_available,
        s.quantity_reserved,
        (s.quantity_available - s.quantity_reserved) as quantity_free,
        s.quantity_alert_threshold,
        s.warehouse_location,
        s.last_updated,
        CASE
          WHEN (s.quantity_available - s.quantity_reserved) <= 0 THEN 'out_of_stock'
          WHEN (s.quantity_available - s.quantity_reserved) <= s.quantity_alert_threshold THEN 'low_stock'
          ELSE 'in_stock'
        END as stock_status
      FROM products p
      JOIN stock s ON s.product_id = p.id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = true
      ${lowStockOnly
        ? this.prisma.$queryRaw`AND (s.quantity_available - s.quantity_reserved) <= s.quantity_alert_threshold`
        : this.prisma.$queryRaw``
      }
      ORDER BY quantity_free ASC
    `;

    return stocks;
  }

  // ── Mettre à jour seuil d'alerte ──────────────────────────
  async updateThreshold(productId: string, dto: UpdateStockThresholdDto) {
    const stock = await this.prisma.stock.findUnique({ where: { productId } });
    if (!stock) throw new NotFoundException();

    return this.prisma.stock.update({
      where: { productId },
      data: {
        quantityAlertThreshold: dto.threshold,
        warehouseLocation: dto.warehouseLocation,
      },
    });
  }

  // ── Rapport rotation de stock ─────────────────────────────
  async getRotationReport(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const report = await this.prisma.$queryRaw<any[]>`
      SELECT
        p.id,
        p.sku,
        p.name_fr,
        p.name_ar,
        p.purchase_price,
        p.selling_price,
        s.quantity_available,
        COALESCE(SUM(CASE WHEN sm.movement_type = 'out' THEN sm.quantity ELSE 0 END), 0) as qty_sold,
        COALESCE(SUM(CASE WHEN sm.movement_type = 'in' THEN sm.quantity ELSE 0 END), 0) as qty_received,
        COALESCE(
          SUM(CASE WHEN sm.movement_type = 'out' THEN sm.quantity * p.selling_price ELSE 0 END), 0
        ) as revenue
      FROM products p
      JOIN stock s ON s.product_id = p.id
      LEFT JOIN stock_movements sm ON sm.product_id = p.id AND sm.created_at >= ${since}
      WHERE p.is_active = true
      GROUP BY p.id, p.sku, p.name_fr, p.name_ar, p.purchase_price, p.selling_price, s.quantity_available
      ORDER BY qty_sold DESC
      LIMIT 100
    `;

    return {
      period: { days, since },
      products: report,
    };
  }

  // ── Alerte stock bas ──────────────────────────────────────
  private async createStockAlert(productId: string, qty: number, threshold: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { nameFr: true, nameAr: true, sku: true },
    });

    const admins = await this.prisma.user.findMany({
      where: { role: { in: ['admin', 'manager'] }, isActive: true },
      select: { id: true },
    });

    const notifications = admins.map((admin) => ({
      userId: admin.id,
      type: 'stock_alert',
      titleFr: `⚠️ Stock bas: ${product?.nameFr}`,
      titleAr: `⚠️ مخزون منخفض: ${product?.nameAr}`,
      messageFr: `Le produit ${product?.sku} a ${qty} unité(s) disponible(s) (seuil: ${threshold})`,
      messageAr: `المنتج ${product?.sku} لديه ${qty} وحدة متاحة (الحد: ${threshold})`,
      metadata: { productId, qty, threshold },
    }));

    await this.prisma.notification.createMany({ data: notifications });
  }

  private getStockStatus(available: number, reserved: number, threshold: number): string {
    const free = available - reserved;
    if (free <= 0) return 'out_of_stock';
    if (free <= threshold) return 'low_stock';
    return 'in_stock';
  }
}
