import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Автогенерировано из Prisma-модели (scripts/gen-response-dto.mjs). Форма ответа для @ApiResponse → OpenAPI → фронтовые типы. */
export class ChatChannelResponseDto {
  @ApiProperty({}) id: number;
  @ApiProperty({}) accountId: number;
  @ApiPropertyOptional({ nullable: true }) channelType?: string | null;
  @ApiPropertyOptional({ nullable: true }) name?: string | null;
  @ApiPropertyOptional({ nullable: true }) description?: string | null;
  @ApiPropertyOptional({ nullable: true }) projectId?: number | null;
  @ApiPropertyOptional({ nullable: true }) constructionSiteId?: number | null;
  @ApiPropertyOptional({ nullable: true }) teamId?: number | null;
  @ApiPropertyOptional({ nullable: true }) createdByUserId?: number | null;
  @ApiProperty({}) isPrivate: boolean;
  @ApiProperty({ type: Object }) settings: Record<string, unknown> | unknown[];
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt: string;
}
