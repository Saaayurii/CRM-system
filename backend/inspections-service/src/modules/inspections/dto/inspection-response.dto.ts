import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Автогенерировано из Prisma-модели (scripts/gen-response-dto.mjs). Форма ответа для @ApiResponse → OpenAPI → фронтовые типы. */
export class InspectionResponseDto {
  @ApiProperty({}) id: number;
  @ApiProperty({}) accountId: number;
  @ApiPropertyOptional({ nullable: true }) projectId?: number | null;
  @ApiPropertyOptional({ nullable: true }) constructionSiteId?: number | null;
  @ApiPropertyOptional({ nullable: true }) taskId?: number | null;
  @ApiPropertyOptional({ nullable: true }) qualityStandardId?: number | null;
  @ApiProperty({}) inspectionNumber: string;
  @ApiPropertyOptional({ nullable: true }) inspectionType?: string | null;
  @ApiPropertyOptional({ nullable: true }) inspectorId?: number | null;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' }) scheduledDate?: string | null;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' }) actualDate?: string | null;
  @ApiProperty({}) status: number;
  @ApiPropertyOptional({ nullable: true }) result?: string | null;
  @ApiPropertyOptional({ nullable: true }) inspectionArea?: string | null;
  @ApiPropertyOptional({ nullable: true }) description?: string | null;
  @ApiPropertyOptional({ nullable: true }) findings?: string | null;
  @ApiPropertyOptional({ nullable: true }) recommendations?: string | null;
  @ApiPropertyOptional({ nullable: true }) score?: number | null;
  @ApiProperty({ type: Object }) photos: Record<string, unknown> | unknown[];
  @ApiProperty({ type: Object }) documents: Record<string, unknown> | unknown[];
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt: string;
}
