import { Controller, Get, Post, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ExecutionLogService } from './execution-log.service';
import { CreateExecutionLogDto } from './dto/create-execution-log.dto';

@ApiTags('Automation Execution Log') @ApiBearerAuth() @Controller('automation-execution-log')
export class ExecutionLogController {
  constructor(private readonly svc: ExecutionLogService) {}

  @Get() @ApiOperation({ summary: 'Get all execution logs' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false }) @ApiQuery({ name: 'automationRuleId', required: false })
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 20, @Query('automationRuleId') ruleId?: number) {
    return this.svc.findAll(+page, +limit, ruleId ? +ruleId : undefined);
  }

  @Get(':id') @ApiOperation({ summary: 'Get execution log by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.svc.findById(id); }

  @Post() @ApiOperation({ summary: 'Create execution log' })
  create(@Body() dto: CreateExecutionLogDto) { return this.svc.create(dto); }
}
