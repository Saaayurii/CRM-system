import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Автогенерировано из Prisma-модели (scripts/gen-response-dto.mjs). Форма ответа для @ApiResponse → OpenAPI → фронтовые типы. */
export class CalendarEventResponseDto {
  @ApiProperty({}) id: number;
  @ApiProperty({}) accountId: number;
  @ApiPropertyOptional({ nullable: true }) projectId?: number | null;
  @ApiPropertyOptional({ nullable: true }) constructionSiteId?: number | null;
  @ApiPropertyOptional({ nullable: true }) taskId?: number | null;
  @ApiPropertyOptional({ nullable: true }) userId?: number | null;
  @ApiProperty({}) title: string;
  @ApiPropertyOptional({ nullable: true }) description?: string | null;
  @ApiPropertyOptional({ nullable: true }) eventType?: string | null;
  @ApiPropertyOptional({ nullable: true }) customTypeId?: number | null;
  @ApiProperty({ type: String, format: 'date-time' }) startDatetime: string;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' }) endDatetime?: string | null;
  @ApiProperty({}) isAllDay: boolean;
  @ApiPropertyOptional({ nullable: true }) location?: string | null;
  @ApiPropertyOptional({ nullable: true }) organizerId?: number | null;
  @ApiProperty({ type: Object }) participants: Record<string, unknown> | unknown[];
  @ApiProperty({ type: Object }) reminders: Record<string, unknown> | unknown[];
  @ApiPropertyOptional({ nullable: true }) status?: string | null;
  @ApiPropertyOptional({ nullable: true }) recurrenceRule?: string | null;
  @ApiPropertyOptional({ nullable: true }) colorHex?: string | null;
  @ApiPropertyOptional({ nullable: true }) visibility?: string | null;
  @ApiPropertyOptional({ nullable: true }) sourceType?: string | null;
  @ApiPropertyOptional({ nullable: true }) sourceId?: number | null;
  @ApiPropertyOptional({ nullable: true }) externalId?: string | null;
  @ApiPropertyOptional({ nullable: true }) externalProvider?: string | null;
  @ApiPropertyOptional({ nullable: true }) externalEtag?: string | null;
  @ApiPropertyOptional({ nullable: true }) integrationId?: number | null;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' }) syncedAt?: string | null;
  @ApiProperty({ type: Object }) extra: Record<string, unknown> | unknown[];
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt: string;
}
