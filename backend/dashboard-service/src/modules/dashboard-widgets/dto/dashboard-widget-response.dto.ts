import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Автогенерировано из Prisma-модели (scripts/gen-response-dto.mjs). Форма ответа для @ApiResponse → OpenAPI → фронтовые типы. */
export class DashboardWidgetResponseDto {
  @ApiProperty({}) id: number;
  @ApiProperty({}) userId: number;
  @ApiPropertyOptional({ nullable: true }) widgetType?: string | null;
  @ApiPropertyOptional({ nullable: true }) title?: string | null;
  @ApiProperty({ type: Object }) configuration: Record<string, unknown> | unknown[];
  @ApiPropertyOptional({ nullable: true }) position?: number | null;
  @ApiPropertyOptional({ nullable: true }) size?: string | null;
  @ApiProperty({}) isVisible: boolean;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt: string;
}
