import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Автогенерировано из Prisma-модели (scripts/gen-response-dto.mjs). Форма ответа для @ApiResponse → OpenAPI → фронтовые типы. */
export class DictionaryTypeResponseDto {
  @ApiProperty({}) id: number;
  @ApiProperty({}) code: string;
  @ApiProperty({}) name: string;
  @ApiPropertyOptional({ nullable: true }) description?: string | null;
  @ApiProperty({}) isSystem: boolean;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: string;
}
