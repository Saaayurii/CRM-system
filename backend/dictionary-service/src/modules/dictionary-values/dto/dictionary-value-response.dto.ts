import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Автогенерировано из Prisma-модели (scripts/gen-response-dto.mjs). Форма ответа для @ApiResponse → OpenAPI → фронтовые типы. */
export class DictionaryValueResponseDto {
  @ApiProperty({}) id: number;
  @ApiProperty({}) dictionaryTypeId: number;
  @ApiProperty({}) accountId: number;
  @ApiPropertyOptional({ nullable: true }) code?: string | null;
  @ApiProperty({}) name: string;
  @ApiPropertyOptional({ nullable: true }) description?: string | null;
  @ApiPropertyOptional({ nullable: true }) parentValueId?: number | null;
  @ApiProperty({}) sortOrder: number;
  @ApiProperty({}) isActive: boolean;
  @ApiProperty({ type: Object }) metadata: Record<string, unknown> | unknown[];
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt: string;
}
