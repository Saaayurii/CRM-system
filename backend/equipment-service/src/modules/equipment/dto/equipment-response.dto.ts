import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Автогенерировано из Prisma-модели (scripts/gen-response-dto.mjs). Форма ответа для @ApiResponse → OpenAPI → фронтовые типы. */
export class EquipmentResponseDto {
  @ApiProperty({}) id: number;
  @ApiProperty({}) accountId: number;
  @ApiProperty({}) name: string;
  @ApiPropertyOptional({ nullable: true }) equipmentType?: string | null;
  @ApiPropertyOptional({ nullable: true }) manufacturer?: string | null;
  @ApiPropertyOptional({ nullable: true }) model?: string | null;
  @ApiPropertyOptional({ nullable: true }) serialNumber?: string | null;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' }) purchaseDate?: string | null;
  @ApiPropertyOptional({ nullable: true }) purchaseCost?: number | null;
  @ApiProperty({}) status: number;
  @ApiPropertyOptional({ nullable: true }) currentLocation?: string | null;
  @ApiPropertyOptional({ nullable: true }) warehouseId?: number | null;
  @ApiPropertyOptional({ nullable: true }) constructionSiteId?: number | null;
  @ApiPropertyOptional({ nullable: true }) assignedToUserId?: number | null;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' }) lastMaintenanceDate?: string | null;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' }) nextMaintenanceDate?: string | null;
  @ApiPropertyOptional({ nullable: true }) maintenanceIntervalDays?: number | null;
  @ApiPropertyOptional({ nullable: true }) notes?: string | null;
  @ApiProperty({ type: Object }) photos: Record<string, unknown> | unknown[];
  @ApiProperty({ type: Object }) documents: Record<string, unknown> | unknown[];
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt: string;
}
