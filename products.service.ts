import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsQueryDto } from './dto/products-query.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Créer un produit ──────────────────────────────────────
  async create(dto: CreateProductDto, userId: string) {
    const existing = await this.prisma.product.findUnique({
      where: { sku: dto.sku },
    });

    if (existing) {
      throw new ConflictException({
        message: `SKU "${dto.sku}" déjà utilisé`,
        messageAr: `الرمز "${dto.sku}" مستخدم مسبقاً`,
      });
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException({
          message: 'Catégorie introuvable',
          messageAr: 'الفئة غير موجودة',
        });
      }
    }

    const product = await this.prisma.product.create({
      data: {
        sku: dto.sku,
        barcode: dto.barcode,
        nameFr: dto.nameFr,
        nameAr: dto.nameAr,
        descriptionFr: dto.descriptionFr,
        descriptionAr: dto.descriptionAr,
        categoryId: dto.categoryId,
        brand: dto.brand,
        unitOfMeasure: dto.unitOfMeasure ?? 'unité',
        purchasePrice: dto.purchasePrice,
        sellingPrice: dto.sellingPrice,
        wholesalePrice: dto.wholesalePrice,
        minWholesaleQty: dto.minWholesaleQty ?? 1,
        tvaRate: dto.tvaRate ?? 19,
        weight: dto.weight,
        images: dto.images ?? [],
        isActive: dto.isActive ?? true,
      },
      include: {
        category: { select: { id: true, nameFr: true, nameAr: true } },
        stock: true,
      },
    });

    return product;
  }

  // ── Liste produits avec filtres ───────────────────────────
  async findAll(query: ProductsQueryDto) {
    const {
      page = 1,
      limit = 20,
      search,
      categoryId,
      minPrice,
      maxPrice,
      lowStock,
      isActive,
      brand,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (isActive !== undefined) where.isActive = isActive;
    if (categoryId) where.categoryId = categoryId;
    if (brand) where.brand = { contains: brand, mode: 'insensitive' };

    if (search) {
      where.OR = [
        { nameFr: { contains: search, mode: 'insensitive' } },
        { nameAr: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.sellingPrice = {};
      if (minPrice !== undefined) where.sellingPrice.gte = minPrice;
      if (maxPrice !== undefined) where.sellingPrice.lte = maxPrice;
    }

    if (lowStock) {
      where.stock = {
        quantityAvailable: {
          lte: this.prisma.$queryRaw`quantity_alert_threshold`,
        },
      };
    }

    const validSortFields = ['nameFr', 'sellingPrice', 'createdAt', 'sku'];
    const orderField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderField]: sortOrder },
        include: {
          category: { select: { id: true, nameFr: true, nameAr: true, slug: true } },
          stock: {
            select: {
              quantityAvailable: true,
              quantityReserved: true,
              quantityAlertThreshold: true,
              warehouseLocation: true,
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Ajouter le statut stock
    const itemsWithStockStatus = items.map((p) => ({
      ...p,
      stockStatus: this.getStockStatus(
        p.stock?.quantityAvailable ?? 0,
        p.stock?.quantityReserved ?? 0,
        p.stock?.quantityAlertThreshold ?? 5,
      ),
    }));

    return {
      items: itemsWithStockStatus,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  // ── Détail produit ────────────────────────────────────────
  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        stock: true,
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            performer: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException({
        message: 'Produit introuvable',
        messageAr: 'المنتج غير موجود',
      });
    }

    return {
      ...product,
      stockStatus: this.getStockStatus(
        product.stock?.quantityAvailable ?? 0,
        product.stock?.quantityReserved ?? 0,
        product.stock?.quantityAlertThreshold ?? 5,
      ),
    };
  }

  // ── Trouver par SKU ───────────────────────────────────────
  async findBySku(sku: string) {
    const product = await this.prisma.product.findUnique({
      where: { sku },
      include: {
        category: true,
        stock: true,
      },
    });

    if (!product) {
      throw new NotFoundException({
        message: `Produit avec SKU "${sku}" introuvable`,
        messageAr: 'المنتج غير موجود',
      });
    }

    return product;
  }

  // ── Mettre à jour ─────────────────────────────────────────
  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);

    if (dto.sku) {
      const existing = await this.prisma.product.findFirst({
        where: { sku: dto.sku, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException({
          message: `SKU "${dto.sku}" déjà utilisé`,
          messageAr: `الرمز "${dto.sku}" مستخدم مسبقاً`,
        });
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: {
        category: { select: { id: true, nameFr: true, nameAr: true } },
        stock: true,
      },
    });
  }

  // ── Supprimer (soft delete via désactivation) ─────────────
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ── Images upload ─────────────────────────────────────────
  async updateImages(id: string, imageUrls: string[]) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: { images: imageUrls },
    });
  }

  // ── Produits low stock ────────────────────────────────────
  async getLowStockProducts() {
    const products = await this.prisma.$queryRaw<any[]>`
      SELECT
        p.id, p.sku, p.name_fr, p.name_ar, p.brand,
        s.quantity_available, s.quantity_reserved, s.quantity_alert_threshold,
        (s.quantity_available - s.quantity_reserved) as quantity_free
      FROM products p
      JOIN stock s ON s.product_id = p.id
      WHERE p.is_active = true
        AND (s.quantity_available - s.quantity_reserved) <= s.quantity_alert_threshold
      ORDER BY (s.quantity_available - s.quantity_reserved) ASC
      LIMIT 50
    `;
    return products;
  }

  // ── Helper statut stock ───────────────────────────────────
  private getStockStatus(available: number, reserved: number, threshold: number): string {
    const free = available - reserved;
    if (free <= 0) return 'out_of_stock';
    if (free <= threshold) return 'low_stock';
    return 'in_stock';
  }
}
