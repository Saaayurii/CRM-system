import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Форма ответа по задаче (мирроринг Prisma-модели Task). Используется в
 * @ApiResponse контроллера → попадает в OpenAPI → фронт получает типы через
 * `npm run gen:api`. Держать в синхроне с prisma/schema.prisma (model Task).
 */
export class TaskResponseDto {
  @ApiProperty() id: number;
  @ApiPropertyOptional({ nullable: true }) accountId?: number | null;
  @ApiPropertyOptional({ nullable: true }) projectId?: number | null;
  @ApiPropertyOptional({ nullable: true }) constructionSiteId?: number | null;
  @ApiPropertyOptional({ nullable: true }) parentTaskId?: number | null;
  @ApiPropertyOptional({ nullable: true }) workTemplateId?: number | null;
  @ApiProperty() title: string;
  @ApiPropertyOptional({ nullable: true }) description?: string | null;
  @ApiPropertyOptional({ nullable: true }) taskType?: string | null;
  @ApiPropertyOptional({ nullable: true }) assignedToUserId?: number | null;
  @ApiPropertyOptional({ nullable: true }) assignedToTeamId?: number | null;
  @ApiPropertyOptional({ nullable: true }) createdByUserId?: number | null;
  @ApiProperty({ description: '1-low, 2-medium, 3-high, 4-critical' }) priority: number;
  @ApiProperty({ description: '0-new, 1-in_progress, 2-review, 3-completed, 4-cancelled' }) status: number;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date' }) startDate?: string | null;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date' }) dueDate?: string | null;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' }) actualStartDate?: string | null;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' }) actualEndDate?: string | null;
  @ApiPropertyOptional({ nullable: true }) estimatedHours?: number | null;
  @ApiPropertyOptional({ nullable: true }) actualHours?: number | null;
  @ApiPropertyOptional({ nullable: true }) locationDescription?: string | null;
  @ApiPropertyOptional({ nullable: true, type: Object }) coordinates?: Record<string, unknown> | null;
  @ApiProperty() progressPercentage: number;
  @ApiPropertyOptional({ nullable: true }) completionNotes?: string | null;
  @ApiProperty({ type: [Object] }) dependencies: unknown[];
  @ApiProperty({ type: [Object] }) blockedBy: unknown[];
  @ApiProperty({ type: [Object] }) attachments: unknown[];
  @ApiProperty({ type: [String] }) tags: string[];
  @ApiProperty({ type: Object }) customFields: Record<string, unknown>;
  @ApiProperty({ type: [String] }) requiresBriefingTypes: string[];
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt: string;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' }) deletedAt?: string | null;
}
