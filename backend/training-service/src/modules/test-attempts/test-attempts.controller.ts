import { Controller, Get, Post, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TestAttemptsService } from './test-attempts.service';
import { CreateTestAttemptDto } from './dto/create-test-attempt.dto';

@ApiTags('Test Attempts') @ApiBearerAuth() @Controller('test-attempts')
export class TestAttemptsController {
  constructor(private readonly svc: TestAttemptsService) {}
  @Get() @ApiOperation({ summary: 'Get all test attempts' }) @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false }) @ApiQuery({ name: 'knowledgeTestId', required: false }) @ApiQuery({ name: 'userId', required: false })
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 20, @Query('knowledgeTestId') ktId?: number, @Query('userId') userId?: number) { return this.svc.findAll(+page, +limit, ktId ? +ktId : undefined, userId ? +userId : undefined); }
  @Get(':id') @ApiOperation({ summary: 'Get test attempt by ID' }) findOne(@Param('id', ParseIntPipe) id: number) { return this.svc.findById(id); }
  @Post() @ApiOperation({ summary: 'Create test attempt' }) create(@Body() dto: CreateTestAttemptDto) { return this.svc.create(dto); }
}
