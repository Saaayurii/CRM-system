import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Автогенерировано из Prisma-модели (scripts/gen-response-dto.mjs). Форма ответа для @ApiResponse → OpenAPI → фронтовые типы. */
export class AttendanceResponseDto {
  @ApiProperty({}) id: number;
  @ApiProperty({}) userId: number;
  @ApiPropertyOptional({ nullable: true }) projectId?: number | null;
  @ApiPropertyOptional({ nullable: true }) constructionSiteId?: number | null;
  @ApiProperty({ type: String, format: 'date-time' }) attendanceDate: string;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' }) checkInTime?: string | null;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' }) checkOutTime?: string | null;
  @ApiPropertyOptional({ nullable: true }) workedHours?: number | null;
  @ApiPropertyOptional({ nullable: true }) overtimeHours?: number | null;
  @ApiPropertyOptional({ nullable: true }) status?: string | null;
  @ApiPropertyOptional({ nullable: true }) notes?: string | null;
  @ApiPropertyOptional({ nullable: true }) photoUrl?: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: string;
}
