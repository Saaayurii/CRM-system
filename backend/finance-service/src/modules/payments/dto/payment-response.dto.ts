import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Автогенерировано из Prisma-модели (scripts/gen-response-dto.mjs). Форма ответа для @ApiResponse → OpenAPI → фронтовые типы. */
export class PaymentResponseDto {
  @ApiProperty({}) id: number;
  @ApiProperty({}) accountId: number;
  @ApiPropertyOptional({ nullable: true }) paymentAccountId?: number | null;
  @ApiPropertyOptional({ nullable: true }) projectId?: number | null;
  @ApiPropertyOptional({ nullable: true }) constructionSiteId?: number | null;
  @ApiProperty({}) paymentNumber: string;
  @ApiPropertyOptional({ nullable: true }) paymentType?: string | null;
  @ApiPropertyOptional({ nullable: true }) direction?: string | null;
  @ApiPropertyOptional({ nullable: true }) subType?: string | null;
  @ApiPropertyOptional({ nullable: true }) documentType?: string | null;
  @ApiPropertyOptional({ nullable: true }) cashLocation?: string | null;
  @ApiPropertyOptional({ nullable: true }) bankName?: string | null;
  @ApiPropertyOptional({ nullable: true }) category?: string | null;
  @ApiPropertyOptional({ nullable: true }) counterpartyType?: string | null;
  @ApiPropertyOptional({ nullable: true }) supplierId?: number | null;
  @ApiPropertyOptional({ nullable: true }) contractorId?: number | null;
  @ApiPropertyOptional({ nullable: true }) userId?: number | null;
  @ApiPropertyOptional({ nullable: true }) supplierOrderId?: number | null;
  @ApiPropertyOptional({ nullable: true }) actId?: number | null;
  @ApiProperty({}) amount: number;
  @ApiPropertyOptional({ nullable: true }) currency?: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) paymentDate: string;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' }) paymentDatetime?: string | null;
  @ApiPropertyOptional({ nullable: true }) paymentMethod?: string | null;
  @ApiPropertyOptional({ nullable: true }) status?: number | null;
  @ApiPropertyOptional({ nullable: true }) description?: string | null;
  @ApiPropertyOptional({ nullable: true }) notes?: string | null;
  @ApiPropertyOptional({ nullable: true, type: Object }) documents?: Record<string, unknown> | unknown[] | null;
  @ApiPropertyOptional({ nullable: true }) createdByUserId?: number | null;
  @ApiPropertyOptional({ nullable: true }) approvedByUserId?: number | null;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' }) createdAt?: string | null;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' }) updatedAt?: string | null;
}
