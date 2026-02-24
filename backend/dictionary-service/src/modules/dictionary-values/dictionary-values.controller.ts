import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DictionaryValuesService } from './dictionary-values.service';
import { CreateDictionaryValueDto, UpdateDictionaryValueDto } from './dto';

@ApiTags('Dictionary Values')
@ApiBearerAuth()
@Controller('dictionary-values')
export class DictionaryValuesController {
  constructor(private readonly service: DictionaryValuesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all dictionary values' })
  @ApiQuery({ name: 'dictionaryTypeId', required: false, type: Number })
  @ApiQuery({ name: 'accountId', required: false, type: Number })
  findAll(
    @Query('dictionaryTypeId') dictionaryTypeId?: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.service.findAll({
      dictionaryTypeId: dictionaryTypeId ? Number(dictionaryTypeId) : undefined,
      accountId: accountId ? Number(accountId) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dictionary value by ID' })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new dictionary value' })
  create(
    @Body() dto: CreateDictionaryValueDto,
    @Headers('x-account-id') accountId: string,
  ) {
    return this.service.create(dto, Number(accountId) || 1);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a dictionary value' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDictionaryValueDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a dictionary value' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}
