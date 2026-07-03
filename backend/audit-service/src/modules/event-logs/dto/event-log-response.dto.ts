import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Автогенерировано из Prisma-модели (scripts/gen-response-dto.mjs). Форма ответа для @ApiResponse → OpenAPI → фронтовые типы. */
export class EventLogResponseDto {
  @ApiProperty({}) id: number;
  @ApiProperty({}) accountId: number;
  @ApiProperty({}) eventType: string;
  @ApiPropertyOptional({ nullable: true }) eventCategory?: string | null;
  @ApiProperty({}) action: string;
  @ApiPropertyOptional({ nullable: true }) entityType?: string | null;
  @ApiPropertyOptional({ nullable: true }) entityId?: number | null;
  @ApiPropertyOptional({ nullable: true }) userId?: number | null;
  @ApiPropertyOptional({ nullable: true }) ipAddress?: string | null;
  @ApiPropertyOptional({ nullable: true }) userAgent?: string | null;
  @ApiPropertyOptional({ nullable: true }) description?: string | null;
  @ApiPropertyOptional({ nullable: true, type: Object }) changes?: Record<string, unknown> | unknown[] | null;
  @ApiProperty({ type: Object }) metadata: Record<string, unknown> | unknown[];
  @ApiPropertyOptional({ nullable: true }) projectId?: number | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: string;
}
