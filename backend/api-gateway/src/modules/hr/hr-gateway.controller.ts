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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { ProxyService } from '../../common/services/proxy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('HR')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class HrGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  // Employee Documents
  @Get('employee-documents')
  @ApiOperation({ summary: 'Get all employee documents' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllDocuments(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('hr', {
      method: 'GET',
      path: '/employee-documents',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('employee-documents/:id')
  @ApiOperation({ summary: 'Get employee document by ID' })
  async findOneDocument(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('hr', {
      method: 'GET',
      path: `/employee-documents/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('employee-documents')
  @ApiOperation({ summary: 'Create employee document' })
  async createDocument(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('hr', {
      method: 'POST',
      path: '/employee-documents',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('employee-documents/:id')
  @ApiOperation({ summary: 'Update employee document' })
  async updateDocument(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('hr', {
      method: 'PUT',
      path: `/employee-documents/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('employee-documents/:id')
  @ApiOperation({ summary: 'Delete employee document' })
  async removeDocument(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('hr', {
      method: 'DELETE',
      path: `/employee-documents/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Time Off Requests
  @Get('time-off-requests')
  @ApiOperation({ summary: 'Get all time off requests' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllTimeOff(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('hr', {
      method: 'GET',
      path: '/time-off-requests',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('time-off-requests/:id')
  @ApiOperation({ summary: 'Get time off request by ID' })
  async findOneTimeOff(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('hr', {
      method: 'GET',
      path: `/time-off-requests/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('time-off-requests')
  @ApiOperation({ summary: 'Create time off request' })
  async createTimeOff(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('hr', {
      method: 'POST',
      path: '/time-off-requests',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('time-off-requests/:id')
  @ApiOperation({ summary: 'Update time off request' })
  async updateTimeOff(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('hr', {
      method: 'PUT',
      path: `/time-off-requests/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('time-off-requests/:id')
  @ApiOperation({ summary: 'Delete time off request' })
  async removeTimeOff(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('hr', {
      method: 'DELETE',
      path: `/time-off-requests/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Attendance
  @Get('attendance')
  @ApiOperation({ summary: 'Get all attendance records' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllAttendance(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('hr', {
      method: 'GET',
      path: '/attendance',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('attendance/:id')
  @ApiOperation({ summary: 'Get attendance record by ID' })
  async findOneAttendance(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('hr', {
      method: 'GET',
      path: `/attendance/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('attendance')
  @ApiOperation({ summary: 'Create attendance record' })
  async createAttendance(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('hr', {
      method: 'POST',
      path: '/attendance',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('attendance/:id')
  @ApiOperation({ summary: 'Update attendance record' })
  async updateAttendance(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('hr', {
      method: 'PUT',
      path: `/attendance/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('attendance/:id')
  @ApiOperation({ summary: 'Delete attendance record' })
  async removeAttendance(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('hr', {
      method: 'DELETE',
      path: `/attendance/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Safety Incidents
  @Get('safety-incidents')
  @ApiOperation({ summary: 'Get all safety incidents' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllIncidents(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('hr', {
      method: 'GET',
      path: '/safety-incidents',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('safety-incidents/:id')
  @ApiOperation({ summary: 'Get safety incident by ID' })
  async findOneIncident(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('hr', {
      method: 'GET',
      path: `/safety-incidents/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('safety-incidents')
  @ApiOperation({ summary: 'Create safety incident' })
  async createIncident(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('hr', {
      method: 'POST',
      path: '/safety-incidents',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('safety-incidents/:id')
  @ApiOperation({ summary: 'Update safety incident' })
  async updateIncident(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('hr', {
      method: 'PUT',
      path: `/safety-incidents/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('safety-incidents/:id')
  @ApiOperation({ summary: 'Delete safety incident' })
  async removeIncident(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('hr', {
      method: 'DELETE',
      path: `/safety-incidents/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Safety Trainings
  @Get('safety-trainings')
  @ApiOperation({ summary: 'Get all safety trainings' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllTrainings(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('hr', {
      method: 'GET',
      path: '/safety-trainings',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('safety-trainings/:id')
  @ApiOperation({ summary: 'Get safety training by ID' })
  async findOneTraining(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('hr', {
      method: 'GET',
      path: `/safety-trainings/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('safety-trainings')
  @ApiOperation({ summary: 'Create safety training' })
  async createTraining(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('hr', {
      method: 'POST',
      path: '/safety-trainings',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('safety-trainings/:id')
  @ApiOperation({ summary: 'Update safety training' })
  async updateTraining(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('hr', {
      method: 'PUT',
      path: `/safety-trainings/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('safety-trainings/:id')
  @ApiOperation({ summary: 'Delete safety training' })
  async removeTraining(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('hr', {
      method: 'DELETE',
      path: `/safety-trainings/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Safety Training Records
  @Post('safety-training-records')
  @ApiOperation({ summary: 'Create safety training record' })
  async createTrainingRecord(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('hr', {
      method: 'POST',
      path: '/safety-training-records',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  // Teams
  @Get('teams')
  @ApiOperation({ summary: 'Get all teams' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllTeams(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('hr', {
      method: 'GET',
      path: '/teams',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('teams/:id')
  @ApiOperation({ summary: 'Get team by ID' })
  async findOneTeam(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('hr', {
      method: 'GET',
      path: `/teams/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('teams')
  @ApiOperation({ summary: 'Create team' })
  async createTeam(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('hr', {
      method: 'POST',
      path: '/teams',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('teams/:id')
  @ApiOperation({ summary: 'Update team' })
  async updateTeam(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('hr', {
      method: 'PUT',
      path: `/teams/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('teams/:id')
  @ApiOperation({ summary: 'Delete team' })
  async removeTeam(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('hr', {
      method: 'DELETE',
      path: `/teams/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Get('teams/:id/members')
  @ApiOperation({ summary: 'Get members of a team' })
  async findTeamMembers(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('hr', {
      method: 'GET',
      path: `/teams/${id}/members`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('teams/:id/members')
  @ApiOperation({ summary: 'Add member to a team' })
  async addTeamMember2(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('hr', {
      method: 'POST',
      path: `/teams/${id}/members`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('teams/:id/members/:userId')
  @ApiOperation({ summary: 'Remove member from a team' })
  async removeTeamMember2(@Req() req: Request, @Param('id') id: string, @Param('userId') userId: string) {
    return this.proxyService.forward('hr', {
      method: 'DELETE',
      path: `/teams/${id}/members/${userId}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Team Members
  @Get('team-members')
  @ApiOperation({ summary: 'Get all team members' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'teamId', required: false })
  async findAllTeamMembers(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('teamId') teamId?: number,
  ) {
    return this.proxyService.forward('hr', {
      method: 'GET',
      path: '/team-members',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit, teamId },
    });
  }

  @Post('team-members')
  @ApiOperation({ summary: 'Add team member' })
  async addTeamMember(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('hr', {
      method: 'POST',
      path: '/team-members',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('team-members/:id')
  @ApiOperation({ summary: 'Remove team member' })
  async removeTeamMember(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('hr', {
      method: 'DELETE',
      path: `/team-members/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }
}
