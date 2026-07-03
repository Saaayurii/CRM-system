import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { DictionaryTypeResponseDto } from './dto/dictionary-type-response.dto';
import { DictionaryTypesService } from './dictionary-types.service';
import { CreateDictionaryTypeDto, UpdateDictionaryTypeDto } from './dto';

@ApiTags('Dictionary Types')
@ApiBearerAuth()
@Controller('dictionary-types')
export class DictionaryTypesController {
  constructor(private readonly service: DictionaryTypesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all dictionary types' })
  @ApiResponse({ status: 200, type: DictionaryTypeResponseDto, isArray: true })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dictionary type by ID' })
  @ApiResponse({ status: 200, type: DictionaryTypeResponseDto })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new dictionary type' })
  @ApiResponse({ status: 201, type: DictionaryTypeResponseDto })
  create(@Body() dto: CreateDictionaryTypeDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a dictionary type' })
  @ApiResponse({ status: 200, type: DictionaryTypeResponseDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDictionaryTypeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a dictionary type' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}
