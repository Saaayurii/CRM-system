import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SafetyService } from './safety.service';
import {
  CreateSafetyIncidentDto,
  UpdateSafetyIncidentDto,
  CreateSafetyTrainingDto,
  UpdateSafetyTrainingDto,
  CreateSafetyTrainingRecordDto,
} from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface RequestUser {
  id: number;
  email: string;
  roleId: number;
  accountId: number;
}

@ApiTags('Safety')
@ApiBearerAuth()
@Controller()
export class SafetyController {
  constructor(private readonly service: SafetyService) {}

  // ─── Safety Incidents ───────────────────────────────────────────────

  @Get('safety-incidents')
  @ApiOperation({ summary: 'Get all safety incidents for current account' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAllIncidents(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAllIncidents(user.accountId, Number(page) || 1, Number(limit) || 20);
  }

  @Post('safety-incidents')
  @ApiOperation({ summary: 'Create safety incident' })
  createIncident(@Body() dto: CreateSafetyIncidentDto, @CurrentUser() user: RequestUser) {
    return this.service.createIncident(user.accountId, dto);
  }

  @Get('safety-incidents/:id')
  @ApiOperation({ summary: 'Get safety incident by ID' })
  findIncidentById(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.findIncidentById(id, user.accountId);
  }

  @Put('safety-incidents/:id')
  @ApiOperation({ summary: 'Update safety incident' })
  updateIncident(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSafetyIncidentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.updateIncident(id, user.accountId, dto);
  }

  @Delete('safety-incidents/:id')
  @ApiOperation({ summary: 'Delete safety incident' })
  deleteIncident(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.deleteIncident(id, user.accountId);
  }

  // ─── Safety Trainings ──────────────────────────────────────────────

  @Get('safety-trainings')
  @ApiOperation({ summary: 'Get all safety trainings for current account' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAllTrainings(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAllTrainings(user.accountId, Number(page) || 1, Number(limit) || 20);
  }

  @Post('safety-trainings')
  @ApiOperation({ summary: 'Create safety training' })
  createTraining(@Body() dto: CreateSafetyTrainingDto, @CurrentUser() user: RequestUser) {
    return this.service.createTraining(user.accountId, dto);
  }

  @Get('safety-trainings/:id')
  @ApiOperation({ summary: 'Get safety training by ID' })
  findTrainingById(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.findTrainingById(id, user.accountId);
  }

  @Put('safety-trainings/:id')
  @ApiOperation({ summary: 'Update safety training' })
  updateTraining(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSafetyTrainingDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.updateTraining(id, user.accountId, dto);
  }

  @Delete('safety-trainings/:id')
  @ApiOperation({ summary: 'Delete safety training' })
  deleteTraining(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.deleteTraining(id, user.accountId);
  }

  // ─── Safety Training Records ───────────────────────────────────────

  @Post('safety-training-records')
  @ApiOperation({ summary: 'Create safety training record' })
  createTrainingRecord(@Body() dto: CreateSafetyTrainingRecordDto) {
    return this.service.createTrainingRecord(dto);
  }
}
