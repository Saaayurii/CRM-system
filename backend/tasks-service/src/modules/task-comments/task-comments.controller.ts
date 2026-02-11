import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TaskCommentsService } from './task-comments.service';
import { CreateTaskCommentDto, UpdateTaskCommentDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface RequestUser {
  id: number;
  email: string;
  roleId: number;
  accountId: number;
}

@ApiTags('Task Comments')
@ApiBearerAuth()
@Controller('task-comments')
export class TaskCommentsController {
  constructor(private readonly taskCommentsService: TaskCommentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all task comments' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'taskId', required: false })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('taskId') taskId?: number,
  ) {
    return this.taskCommentsService.findAll(page || 1, limit || 20, { taskId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task comment by ID' })
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.taskCommentsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create task comment' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() createDto: CreateTaskCommentDto,
  ) {
    return this.taskCommentsService.create(createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update task comment' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateTaskCommentDto,
  ) {
    return this.taskCommentsService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete task comment' })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.taskCommentsService.remove(id);
  }
}
