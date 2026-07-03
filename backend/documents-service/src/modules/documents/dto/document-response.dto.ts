import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Автогенерировано из Prisma-модели (scripts/gen-response-dto.mjs). Форма ответа для @ApiResponse → OpenAPI → фронтовые типы. */
export class DocumentResponseDto {
  @ApiProperty({}) id: number;
  @ApiProperty({}) accountId: number;
  @ApiPropertyOptional({ nullable: true }) documentType?: string | null;
  @ApiProperty({}) title: string;
  @ApiPropertyOptional({ nullable: true }) documentNumber?: string | null;
  @ApiPropertyOptional({ nullable: true }) description?: string | null;
  @ApiPropertyOptional({ nullable: true }) projectId?: number | null;
  @ApiPropertyOptional({ nullable: true }) constructionSiteId?: number | null;
  @ApiPropertyOptional({ nullable: true }) supplierId?: number | null;
  @ApiPropertyOptional({ nullable: true }) contractorId?: number | null;
  @ApiPropertyOptional({ nullable: true }) version?: string | null;
  @ApiPropertyOptional({ nullable: true }) parentDocumentId?: number | null;
  @ApiPropertyOptional({ nullable: true }) fileUrl?: string | null;
  @ApiPropertyOptional({ nullable: true }) fileSize?: number | null;
  @ApiPropertyOptional({ nullable: true }) fileType?: string | null;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' }) issueDate?: string | null;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' }) expiryDate?: string | null;
  @ApiPropertyOptional({ nullable: true }) status?: string | null;
  @ApiPropertyOptional({ nullable: true }) uploadedByUserId?: number | null;
  @ApiPropertyOptional({ nullable: true }) approvedByUserId?: number | null;
  @ApiPropertyOptional({ nullable: true }) accessLevel?: string | null;
  @ApiProperty({ type: Object }) allowedRoles: Record<string, unknown> | unknown[];
  @ApiProperty({ type: Object }) tags: Record<string, unknown> | unknown[];
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt: string;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' }) deletedAt?: string | null;
}
