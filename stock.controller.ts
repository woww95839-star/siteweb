import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, ParseUUIDPipe, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { StockService } from './stock.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { UpdateStockThresholdDto } from './dto/update-stock-threshold.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('stock')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  @ApiOperation({ summary: 'Vue globale du stock' })
  @ApiQuery({ name: 'lowStockOnly', required: false, type: Boolean })
  getAllStock(@Query('lowStockOnly') lowStockOnly?: boolean) {
    return this.stockService.getAllStock(lowStockOnly);
  }

  @Get('movements')
  @ApiOperation({ summary: 'Historique des mouvements de stock' })
  getMovements(
    @Query('productId') productId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.stockService.getMovements(productId, page, limit);
  }

  @Get('rotation-report')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Rapport de rotation de stock' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  getRotation(@Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number) {
    return this.stockService.getRotationReport(days);
  }

  @Get(':productId')
  @ApiOperation({ summary: 'Stock d\'un produit' })
  getProductStock(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.stockService.getProductStock(productId);
  }

  @Post('movements')
  @Roles('admin', 'manager', 'staff')
  @ApiOperation({ summary: 'Enregistrer un mouvement de stock' })
  recordMovement(
    @Body() dto: CreateStockMovementDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.stockService.recordMovement(dto, userId);
  }

  @Patch(':productId/threshold')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Modifier le seuil d\'alerte' })
  updateThreshold(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: UpdateStockThresholdDto,
  ) {
    return this.stockService.updateThreshold(productId, dto);
  }
}
