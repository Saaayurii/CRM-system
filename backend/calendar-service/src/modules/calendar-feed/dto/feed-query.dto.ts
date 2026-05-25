import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class FeedQueryDto {
  @ApiPropertyOptional({ description: 'ISO start of range' })
  @IsString()
  start: string;

  @ApiPropertyOptional({ description: 'ISO end of range' })
  @IsString()
  end: string;

  @ApiPropertyOptional({
    description:
      'Источники: calendar,tasks,inspections,timeoff,attendance,projects,external. По умолчанию все.',
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  @IsArray()
  sources?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  projectId?: number;

  @ApiPropertyOptional({ description: 'Только мои события' })
  @IsOptional()
  mine?: string;
}
