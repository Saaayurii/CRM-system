import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Автогенерировано из Prisma-модели (scripts/gen-response-dto.mjs). Форма ответа для @ApiResponse → OpenAPI → фронтовые типы. */
export class ReportTemplateResponseDto {
  @ApiProperty({}) id: number;
  @ApiProperty({}) accountId: number;
  @ApiProperty({}) name: string;
  @ApiPropertyOptional({ nullable: true }) reportType?: string | null;
  @ApiPropertyOptional({ nullable: true }) description?: string | null;
  @ApiProperty({ type: Object }) configuration: Record<string, unknown> | unknown[];
  @ApiProperty({ type: Object }) allowedRoles: Record<string, unknown> | unknown[];
  @ApiPropertyOptional({ nullable: true }) createdByUserId?: number | null;
  @ApiProperty({}) isActive: boolean;
  @ApiPropertyOptional({ nullable: true }) fileUrl?: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt: string;
}
