import {
  IsUUID, IsIn, IsNumber, IsOptional, IsString, IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateStockMovementDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ enum: ['in', 'out', 'adjustment', 'return', 'damaged'] })
  @IsIn(['in', 'out', 'adjustment', 'return', 'damaged'])
  movementType: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  unitCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notesAr?: string;
}
