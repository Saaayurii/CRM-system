import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TrainingMaterialsService } from './training-materials.service';
import { CreateTrainingMaterialDto } from './dto/create-training-material.dto';
import { UpdateTrainingMaterialDto } from './dto/update-training-material.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Training Materials') @ApiBearerAuth() @Controller('training-materials')
export class TrainingMaterialsController {
  constructor(private readonly svc: TrainingMaterialsService) {}
  @Get() @ApiOperation({ summary: 'Get all training materials' }) @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false }) @ApiQuery({ name: 'category', required: false })
  findAll(@CurrentUser('accountId') accountId: number, @Query('page') page: number = 1, @Query('limit') limit: number = 20, @Query('category') category?: string) { return this.svc.findAll(accountId, +page, +limit, category); }
  @Get(':id') @ApiOperation({ summary: 'Get training material by ID' }) findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser('accountId') accountId: number) { return this.svc.findById(id, accountId); }
  @Post() @ApiOperation({ summary: 'Create training material' }) create(@Body() dto: CreateTrainingMaterialDto, @CurrentUser('accountId') accountId: number) { return this.svc.create(accountId, dto); }
  @Put(':id') @ApiOperation({ summary: 'Update training material' }) update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTrainingMaterialDto, @CurrentUser('accountId') accountId: number) { return this.svc.update(id, accountId, dto); }
  @Delete(':id') @ApiOperation({ summary: 'Delete training material' }) remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('accountId') accountId: number) { return this.svc.delete(id, accountId); }
}
