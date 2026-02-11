import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { ProxyService } from '../../common/services/proxy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class TasksGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  // Tasks
  @Get('tasks')
  @ApiOperation({ summary: 'Get all tasks' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllTasks(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.forward('tasks', {
      method: 'GET', path: '/tasks',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get task by ID' })
  async findOneTask(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('tasks', {
      method: 'GET', path: `/tasks/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('tasks')
  @ApiOperation({ summary: 'Create task' })
  async createTask(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('tasks', {
      method: 'POST', path: '/tasks',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('tasks/:id')
  @ApiOperation({ summary: 'Update task' })
  async updateTask(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('tasks', {
      method: 'PUT', path: `/tasks/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('tasks/:id')
  @ApiOperation({ summary: 'Delete task' })
  async removeTask(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('tasks', {
      method: 'DELETE', path: `/tasks/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Task Comments
  @Get('task-comments')
  @ApiOperation({ summary: 'Get all task comments' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false }) @ApiQuery({ name: 'taskId', required: false })
  async findAllComments(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number, @Query('taskId') taskId?: number) {
    return this.proxyService.forward('tasks', { method: 'GET', path: '/task-comments', headers: { authorization: req.headers.authorization || '' }, params: { page, limit, taskId } });
  }

  @Get('task-comments/:id')
  @ApiOperation({ summary: 'Get task comment by ID' })
  async findOneComment(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('tasks', { method: 'GET', path: `/task-comments/${id}`, headers: { authorization: req.headers.authorization || '' } });
  }

  @Post('task-comments')
  @ApiOperation({ summary: 'Create task comment' })
  async createComment(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('tasks', { method: 'POST', path: '/task-comments', headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' }, data: body });
  }

  @Put('task-comments/:id')
  @ApiOperation({ summary: 'Update task comment' })
  async updateComment(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('tasks', { method: 'PUT', path: `/task-comments/${id}`, headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' }, data: body });
  }

  @Delete('task-comments/:id')
  @ApiOperation({ summary: 'Delete task comment' })
  async removeComment(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('tasks', { method: 'DELETE', path: `/task-comments/${id}`, headers: { authorization: req.headers.authorization || '' } });
  }

  // Task Time Logs
  @Get('task-time-logs')
  @ApiOperation({ summary: 'Get all task time logs' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false }) @ApiQuery({ name: 'taskId', required: false })
  async findAllTimeLogs(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number, @Query('taskId') taskId?: number) {
    return this.proxyService.forward('tasks', { method: 'GET', path: '/task-time-logs', headers: { authorization: req.headers.authorization || '' }, params: { page, limit, taskId } });
  }

  @Get('task-time-logs/:id')
  @ApiOperation({ summary: 'Get task time log by ID' })
  async findOneTimeLog(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('tasks', { method: 'GET', path: `/task-time-logs/${id}`, headers: { authorization: req.headers.authorization || '' } });
  }

  @Post('task-time-logs')
  @ApiOperation({ summary: 'Create task time log' })
  async createTimeLog(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('tasks', { method: 'POST', path: '/task-time-logs', headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' }, data: body });
  }

  @Put('task-time-logs/:id')
  @ApiOperation({ summary: 'Update task time log' })
  async updateTimeLog(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('tasks', { method: 'PUT', path: `/task-time-logs/${id}`, headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' }, data: body });
  }

  @Delete('task-time-logs/:id')
  @ApiOperation({ summary: 'Delete task time log' })
  async removeTimeLog(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('tasks', { method: 'DELETE', path: `/task-time-logs/${id}`, headers: { authorization: req.headers.authorization || '' } });
  }

  // Task Status History
  @Get('task-status-history')
  @ApiOperation({ summary: 'Get task status history' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false }) @ApiQuery({ name: 'taskId', required: false })
  async findAllStatusHistory(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number, @Query('taskId') taskId?: number) {
    return this.proxyService.forward('tasks', { method: 'GET', path: '/task-status-history', headers: { authorization: req.headers.authorization || '' }, params: { page, limit, taskId } });
  }

  @Get('task-status-history/:id')
  @ApiOperation({ summary: 'Get task status history entry by ID' })
  async findOneStatusHistory(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('tasks', { method: 'GET', path: `/task-status-history/${id}`, headers: { authorization: req.headers.authorization || '' } });
  }

  @Post('task-status-history')
  @ApiOperation({ summary: 'Create task status history entry' })
  async createStatusHistory(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('tasks', { method: 'POST', path: '/task-status-history', headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' }, data: body });
  }
}
