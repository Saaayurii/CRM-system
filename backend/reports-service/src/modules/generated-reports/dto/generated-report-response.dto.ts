import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Автогенерировано из Prisma-модели (scripts/gen-response-dto.mjs). Форма ответа для @ApiResponse → OpenAPI → фронтовые типы. */
export class GeneratedReportResponseDto {
  @ApiProperty({}) id: number;
  @ApiProperty({}) accountId: number;
  @ApiPropertyOptional({ nullable: true }) reportTemplateId?: number | null;
  @ApiPropertyOptional({ nullable: true }) reportName?: string | null;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' }) periodStart?: string | null;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' }) periodEnd?: string | null;
  @ApiPropertyOptional({ nullable: true }) projectId?: number | null;
  @ApiPropertyOptional({ nullable: true }) constructionSiteId?: number | null;
  @ApiPropertyOptional({ nullable: true, type: Object }) reportData?: Record<string, unknown> | unknown[] | null;
  @ApiPropertyOptional({ nullable: true }) fileUrl?: string | null;
  @ApiPropertyOptional({ nullable: true }) generatedByUserId?: number | null;
  @ApiProperty({ type: String, format: 'date-time' }) generatedAt: string;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: string;
}
