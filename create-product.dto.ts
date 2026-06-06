import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
  IsArray,
  IsUrl,
  Min,
  Max,
  MaxLength,
  IsNotEmpty,
  IsPositive,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'HUI-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  sku: string;

  @ApiPropertyOptional({ example: '6191234560001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  barcode?: string;

  @ApiProperty({ example: 'Huile de table 5L' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nameFr: string;

  @ApiPropertyOptional({ example: 'زيت المائدة 5 لتر' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameAr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionFr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'Cevital' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({ example: 'bidon', default: 'unité' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unitOfMeasure?: string;

  @ApiProperty({ example: 750.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  purchasePrice: number;

  @ApiProperty({ example: 890.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  sellingPrice: number;

  @ApiProperty({ example: 820.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  wholesalePrice: number;

  @ApiPropertyOptional({ example: 12, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  minWholesaleQty?: number;

  @ApiPropertyOptional({ example: 19, default: 19 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @Type(() => Number)
  tvaRate?: number;

  @ApiPropertyOptional({ example: 5.5 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Type(() => Number)
  weight?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
