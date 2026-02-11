import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { KnowledgeTestsService } from './knowledge-tests.service';
import { CreateKnowledgeTestDto } from './dto/create-knowledge-test.dto';
import { UpdateKnowledgeTestDto } from './dto/update-knowledge-test.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Knowledge Tests') @ApiBearerAuth() @Controller('knowledge-tests')
export class KnowledgeTestsController {
  constructor(private readonly svc: KnowledgeTestsService) {}
  @Get() @ApiOperation({ summary: 'Get all knowledge tests' }) @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  findAll(@CurrentUser('accountId') accountId: number, @Query('page') page: number = 1, @Query('limit') limit: number = 20) { return this.svc.findAll(accountId, +page, +limit); }
  @Get(':id') @ApiOperation({ summary: 'Get knowledge test by ID' }) findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser('accountId') accountId: number) { return this.svc.findById(id, accountId); }
  @Post() @ApiOperation({ summary: 'Create knowledge test' }) create(@Body() dto: CreateKnowledgeTestDto, @CurrentUser('accountId') accountId: number) { return this.svc.create(accountId, dto); }
  @Put(':id') @ApiOperation({ summary: 'Update knowledge test' }) update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateKnowledgeTestDto, @CurrentUser('accountId') accountId: number) { return this.svc.update(id, accountId, dto); }
  @Delete(':id') @ApiOperation({ summary: 'Delete knowledge test' }) remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('accountId') accountId: number) { return this.svc.delete(id, accountId); }
}
