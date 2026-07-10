import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class SaveChecklistDto {
  @ApiPropertyOptional({ description: 'ID шаблона чек-листа' })
  @IsOptional()
  @IsInt()
  checklistTemplateId?: number;

  @ApiProperty({
    description:
      'Результаты проверки по пунктам: [{ key, status, comment?, photos? }]',
    type: 'array',
    items: { type: 'object' },
  })
  @IsArray()
  // See create-inspection-template.dto.ts checklistItems comment: without an
  // explicit element type, the global ValidationPipe's enableImplicitConversion
  // silently collapses every element of this array down to `[]`.
  @Type(() => Object)
  results: any[];
}
