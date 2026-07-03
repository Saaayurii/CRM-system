import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Автогенерировано из Prisma-модели (scripts/gen-response-dto.mjs). Форма ответа для @ApiResponse → OpenAPI → фронтовые типы. */
export class ClientResponseDto {
  @ApiProperty({}) id: number;
  @ApiProperty({}) accountId: number;
  @ApiPropertyOptional({ nullable: true }) clientType?: string | null;
  @ApiPropertyOptional({ nullable: true }) firstName?: string | null;
  @ApiPropertyOptional({ nullable: true }) lastName?: string | null;
  @ApiPropertyOptional({ nullable: true }) middleName?: string | null;
  @ApiPropertyOptional({ nullable: true }) companyName?: string | null;
  @ApiPropertyOptional({ nullable: true }) legalName?: string | null;
  @ApiPropertyOptional({ nullable: true }) inn?: string | null;
  @ApiPropertyOptional({ nullable: true }) kpp?: string | null;
  @ApiPropertyOptional({ nullable: true }) ogrn?: string | null;
  @ApiPropertyOptional({ nullable: true }) phone?: string | null;
  @ApiPropertyOptional({ nullable: true }) email?: string | null;
  @ApiPropertyOptional({ nullable: true }) address?: string | null;
  @ApiPropertyOptional({ nullable: true }) legalAddress?: string | null;
  @ApiPropertyOptional({ nullable: true }) actualAddress?: string | null;
  @ApiPropertyOptional({ nullable: true }) signatoryName?: string | null;
  @ApiPropertyOptional({ nullable: true }) signatoryPosition?: string | null;
  @ApiPropertyOptional({ nullable: true }) assignedManagerId?: number | null;
  @ApiPropertyOptional({ nullable: true }) status?: string | null;
  @ApiPropertyOptional({ nullable: true }) source?: string | null;
  @ApiPropertyOptional({ nullable: true }) notes?: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt: string;
}
