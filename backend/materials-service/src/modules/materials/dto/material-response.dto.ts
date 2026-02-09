import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MaterialResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  accountId: number;

  @ApiPropertyOptional({ example: 1 })
  categoryId?: number;

  @ApiPropertyOptional()
  category?: any;

  @ApiProperty({ example: 'Цемент М500' })
  name: string;

  @ApiPropertyOptional({ example: 'MAT-001' })
  code?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'кг' })
  unit?: string;

  @ApiPropertyOptional({ example: 'Евроцемент' })
  manufacturer?: string;

  @ApiPropertyOptional()
  specifications?: Record<string, any>;

  @ApiPropertyOptional({ example: 450.00 })
  basePrice?: number;

  @ApiPropertyOptional({ example: 'RUB' })
  currency?: string;

  @ApiPropertyOptional()
  minStockLevel?: number;

  @ApiPropertyOptional()
  maxStockLevel?: number;

  @ApiPropertyOptional()
  reorderPoint?: number;

  @ApiPropertyOptional()
  photos?: any[];

  @ApiPropertyOptional()
  documents?: any[];

  @ApiPropertyOptional()
  barcode?: string;

  @ApiPropertyOptional()
  qrCode?: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
