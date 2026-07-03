import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Автогенерировано из Prisma-модели (scripts/gen-response-dto.mjs). Форма ответа для @ApiResponse → OpenAPI → фронтовые типы. */
export class NotificationResponseDto {
  @ApiProperty({}) id: number;
  @ApiProperty({}) accountId: number;
  @ApiProperty({}) userId: number;
  @ApiPropertyOptional({ nullable: true }) notificationType?: string | null;
  @ApiProperty({}) title: string;
  @ApiPropertyOptional({ nullable: true }) message?: string | null;
  @ApiPropertyOptional({ nullable: true }) entityType?: string | null;
  @ApiPropertyOptional({ nullable: true }) entityId?: number | null;
  @ApiProperty({ type: Object }) channels: Record<string, unknown> | unknown[];
  @ApiProperty({}) priority: number;
  @ApiProperty({}) isRead: boolean;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' }) readAt?: string | null;
  @ApiPropertyOptional({ nullable: true }) actionUrl?: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: string;
}
