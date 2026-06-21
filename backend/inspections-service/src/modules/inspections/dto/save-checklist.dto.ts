import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional } from 'class-validator';

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
  results: any[];
}
