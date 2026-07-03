import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto, TaskResponseDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface RequestUser {
  id: number;
  email: string;
  roleId: number;
  accountId: number;
  clientId?: number;
}

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'Get all tasks' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'assignedToUserId', required: false })
  @ApiQuery({ name: 'constructionSiteId', required: false })
  @ApiResponse({ status: 200, type: TaskResponseDto, isArray: true })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('projectId') projectId?: number,
    @Query('status') status?: number,
    @Query('assignedToUserId') assignedToUserId?: number,
    @Query('constructionSiteId') constructionSiteId?: number,
  ) {
    return this.tasksService.findAll(user, page || 1, limit || 20, {
      projectId,
      status,
      assignedToUserId,
      constructionSiteId,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get tasks statistics' })
  @ApiQuery({ name: 'projectId', required: false })
  async getStats(
    @CurrentUser() user: RequestUser,
    @Query('projectId') projectId?: number,
  ) {
    return this.tasksService.getStats(user.accountId, projectId);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get tasks by project' })
  @ApiResponse({ status: 200, type: TaskResponseDto, isArray: true })
  async findByProject(
    @CurrentUser() user: RequestUser,
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.tasksService.findByProject(projectId, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiResponse({ status: 200, type: TaskResponseDto })
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tasksService.findById(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Create new task' })
  @ApiResponse({ status: 201, type: TaskResponseDto })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    return this.tasksService.create(createTaskDto, user.id, user.accountId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update task' })
  @ApiResponse({ status: 200, type: TaskResponseDto })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, updateTaskDto, user.accountId, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete task' })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tasksService.remove(id, user.accountId, user.id);
  }

  @Post(':id/assignees')
  @ApiOperation({ summary: 'Set task assignees (replaces existing)' })
  async setAssignees(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { assignees?: { userId: number; userName?: string }[]; userIds?: number[] },
  ) {
    // Support both formats: { assignees: [{userId, userName}] } and legacy { userIds: [] }
    const assignees = body.assignees
      ? body.assignees
      : (body.userIds || []).map((uid) => ({ userId: uid }));
    return this.tasksService.setAssignees(id, assignees, user.accountId);
  }

  @Get(':id/assignees')
  @ApiOperation({ summary: 'Get task assignees' })
  async getAssignees(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tasksService.getAssignees(id, user.accountId);
  }
}
