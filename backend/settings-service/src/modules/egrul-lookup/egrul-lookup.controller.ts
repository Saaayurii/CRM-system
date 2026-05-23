import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { EgrulLookupService } from './egrul-lookup.service';

@ApiTags('Company Lookup')
@ApiBearerAuth()
@Controller('company-lookup')
export class EgrulLookupController {
  constructor(private readonly svc: EgrulLookupService) {}

  @Get('egrul')
  @ApiOperation({ summary: 'Поиск компании по ИНН/ОГРН в ЕГРЮЛ' })
  @ApiQuery({ name: 'query', required: false, description: 'ИНН или ОГРН' })
  @ApiQuery({ name: 'inn', required: false, description: 'Алиас query' })
  lookup(@Query('query') query?: string, @Query('inn') inn?: string) {
    const value = (query || inn || '').trim();
    if (!value) {
      throw new BadRequestException('Параметр query (ИНН/ОГРН) обязателен');
    }
    return this.svc.lookup(value);
  }
}
