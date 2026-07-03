import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Автогенерировано из Prisma-модели (scripts/gen-response-dto.mjs). Форма ответа для @ApiResponse → OpenAPI → фронтовые типы. */
export class WikiPageResponseDto {
  @ApiProperty({}) id: number;
  @ApiProperty({}) accountId: number;
  @ApiProperty({}) title: string;
  @ApiPropertyOptional({ nullable: true }) slug?: string | null;
  @ApiPropertyOptional({ nullable: true }) content?: string | null;
  @ApiProperty({ type: Object }) blocks: Record<string, unknown> | unknown[];
  @ApiPropertyOptional({ nullable: true }) category?: string | null;
  @ApiPropertyOptional({ nullable: true }) parentPageId?: number | null;
  @ApiProperty({}) version: number;
  @ApiPropertyOptional({ nullable: true }) createdByUserId?: number | null;
  @ApiPropertyOptional({ nullable: true }) updatedByUserId?: number | null;
  @ApiProperty({}) isPublic: boolean;
  @ApiProperty({ type: Object }) allowedRoles: Record<string, unknown> | unknown[];
  @ApiProperty({ type: Object }) tags: Record<string, unknown> | unknown[];
  @ApiProperty({ type: Object }) attachments: Record<string, unknown> | unknown[];
  @ApiProperty({}) viewCount: number;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt: string;
}
