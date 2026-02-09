import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SupplierResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() accountId: number;
  @ApiProperty() name: string;
  @ApiPropertyOptional() legalName?: string;
  @ApiPropertyOptional() inn?: string;
  @ApiPropertyOptional() kpp?: string;
  @ApiPropertyOptional() contactPerson?: string;
  @ApiPropertyOptional() phone?: string;
  @ApiPropertyOptional() email?: string;
  @ApiPropertyOptional() website?: string;
  @ApiPropertyOptional() legalAddress?: string;
  @ApiPropertyOptional() warehouseAddress?: string;
  @ApiPropertyOptional() paymentTerms?: string;
  @ApiPropertyOptional() deliveryTimeDays?: number;
  @ApiPropertyOptional() minOrderAmount?: number;
  @ApiPropertyOptional() rating?: number;
  @ApiPropertyOptional() reliabilityScore?: number;
  @ApiProperty() status: number;
  @ApiProperty() isVerified: boolean;
  @ApiPropertyOptional() notes?: string;
  @ApiPropertyOptional() documents?: any[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
