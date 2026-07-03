import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Автогенерировано из Prisma-модели (scripts/gen-response-dto.mjs). Форма ответа для @ApiResponse → OpenAPI → фронтовые типы. */
export class TrainingMaterialResponseDto {
  @ApiProperty({}) id: number;
  @ApiProperty({}) accountId: number;
  @ApiProperty({}) title: string;
  @ApiPropertyOptional({ nullable: true }) materialType?: string | null;
  @ApiPropertyOptional({ nullable: true }) content?: string | null;
  @ApiPropertyOptional({ nullable: true }) fileUrl?: string | null;
  @ApiPropertyOptional({ nullable: true }) coverUrl?: string | null;
  @ApiPropertyOptional({ nullable: true }) category?: string | null;
  @ApiPropertyOptional({ nullable: true }) difficultyLevel?: string | null;
  @ApiPropertyOptional({ nullable: true }) durationMinutes?: number | null;
  @ApiPropertyOptional({ nullable: true }) description?: string | null;
  @ApiProperty({ type: Object }) tags: Record<string, unknown> | unknown[];
  @ApiProperty({}) isMandatory: boolean;
  @ApiProperty({ type: Object }) targetRoleIds: Record<string, unknown> | unknown[];
  @ApiPropertyOptional({ nullable: true }) createdByUserId?: number | null;
  @ApiProperty({}) isPublished: boolean;
  @ApiProperty({}) viewCount: number;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt: string;
}
