import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DictionaryTypesService } from './dictionary-types.service';
import { CreateDictionaryTypeDto, UpdateDictionaryTypeDto } from './dto';

@ApiTags('Dictionary Types')
@ApiBearerAuth()
@Controller('dictionary-types')
export class DictionaryTypesController {
  constructor(private readonly service: DictionaryTypesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all dictionary types' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dictionary type by ID' })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new dictionary type' })
  create(@Body() dto: CreateDictionaryTypeDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a dictionary type' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDictionaryTypeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a dictionary type' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}
