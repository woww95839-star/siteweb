import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateStockThresholdDto {
  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  threshold: number;

  @ApiPropertyOptional({ example: 'Rayon A-12' })
  @IsOptional()
  @IsString()
  warehouseLocation?: string;
}
