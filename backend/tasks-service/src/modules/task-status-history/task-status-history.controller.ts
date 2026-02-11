import {
  Controller, Get, Post, Body, Param, Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TaskStatusHistoryService } from './task-status-history.service';
import { CreateTaskStatusHistoryDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface RequestUser {
  id: number;
  email: string;
  roleId: number;
  accountId: number;
}

@ApiTags('Task Status History')
@ApiBearerAuth()
@Controller('task-status-history')
export class TaskStatusHistoryController {
  constructor(private readonly taskStatusHistoryService: TaskStatusHistoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get all task status history records' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'taskId', required: false })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('taskId') taskId?: number,
  ) {
    return this.taskStatusHistoryService.findAll(page || 1, limit || 20, { taskId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task status history record by ID' })
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.taskStatusHistoryService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create task status history record' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() createDto: CreateTaskStatusHistoryDto,
  ) {
    return this.taskStatusHistoryService.create(createDto);
  }
}
