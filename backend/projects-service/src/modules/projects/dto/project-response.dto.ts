import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  accountId: number;

  @ApiProperty({ example: 'ЖК Солнечный' })
  name: string;

  @ApiPropertyOptional({ example: 'PRJ-001' })
  code?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional({ example: 1 })
  projectManagerId?: number;

  @ApiPropertyOptional()
  projectManager?: {
    id: number;
    name: string;
    email: string;
  };

  @ApiPropertyOptional({ example: 'ООО Застройщик' })
  clientName?: string;

  @ApiPropertyOptional()
  clientContact?: Record<string, any>;

  @ApiPropertyOptional()
  startDate?: Date;

  @ApiPropertyOptional()
  plannedEndDate?: Date;

  @ApiPropertyOptional()
  actualEndDate?: Date;

  @ApiPropertyOptional({ example: 10000000 })
  budget?: number;

  @ApiPropertyOptional({ example: 5000000 })
  actualCost?: number;

  @ApiProperty({ example: 1, description: '0-draft, 1-active, 2-paused, 3-completed, 4-cancelled' })
  status: number;

  @ApiProperty({ example: 2, description: '1-low, 2-medium, 3-high, 4-critical' })
  priority: number;

  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional()
  coordinates?: Record<string, any>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
