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
} from '@nestjs/swagger';
import { TaskTimeLogsService } from './task-time-logs.service';
import { CreateTaskTimeLogDto, UpdateTaskTimeLogDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface RequestUser {
  id: number;
  email: string;
  roleId: number;
  accountId: number;
}

@ApiTags('Task Time Logs')
@ApiBearerAuth()
@Controller('task-time-logs')
export class TaskTimeLogsController {
  constructor(private readonly taskTimeLogsService: TaskTimeLogsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all task time logs' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'taskId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('taskId') taskId?: number,
    @Query('userId') userId?: number,
  ) {
    return this.taskTimeLogsService.findAll(page || 1, limit || 20, {
      taskId,
      userId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task time log by ID' })
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.taskTimeLogsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create task time log' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() createDto: CreateTaskTimeLogDto,
  ) {
    return this.taskTimeLogsService.create(createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update task time log' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateTaskTimeLogDto,
  ) {
    return this.taskTimeLogsService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete task time log' })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.taskTimeLogsService.remove(id);
  }
}
