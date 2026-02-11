import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TeamMembersService } from './team-members.service';
import { CreateTeamMemberDto, UpdateTeamMemberDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface RequestUser {
  id: number;
  email: string;
  roleId: number;
  accountId: number;
}

@ApiTags('Team Members')
@ApiBearerAuth()
@Controller('team-members')
export class TeamMembersController {
  constructor(private readonly service: TeamMembersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all team members' })
  @ApiQuery({ name: 'teamId', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('teamId') teamId?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(
      Number(page) || 1,
      Number(limit) || 20,
      teamId ? Number(teamId) : undefined,
      userId ? Number(userId) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team member by ID' })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create team member' })
  create(@Body() dto: CreateTeamMemberDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update team member' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTeamMemberDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete team member' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}
