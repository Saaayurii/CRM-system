import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Автогенерировано из Prisma-модели (scripts/gen-response-dto.mjs). Форма ответа для @ApiResponse → OpenAPI → фронтовые типы. */
export class AutomationRuleResponseDto {
  @ApiProperty({}) id: number;
  @ApiProperty({}) accountId: number;
  @ApiProperty({}) name: string;
  @ApiPropertyOptional({ nullable: true }) description?: string | null;
  @ApiPropertyOptional({ nullable: true }) ruleType?: string | null;
  @ApiPropertyOptional({ nullable: true }) triggerEvent?: string | null;
  @ApiProperty({ type: Object }) triggerConditions: Record<string, unknown> | unknown[];
  @ApiProperty({ type: Object }) actions: Record<string, unknown> | unknown[];
  @ApiProperty({}) isActive: boolean;
  @ApiProperty({}) executionCount: number;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' }) lastExecutedAt?: string | null;
  @ApiPropertyOptional({ nullable: true }) createdByUserId?: number | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt: string;
}
