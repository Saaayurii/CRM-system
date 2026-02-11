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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TeamsService } from './teams.service';
import { CreateTeamDto, UpdateTeamDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface RequestUser {
  id: number;
  email: string;
  roleId: number;
  accountId: number;
}

@ApiTags('Teams')
@ApiBearerAuth()
@Controller('teams')
export class TeamsController {
  constructor(private readonly service: TeamsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all teams for current account' })
  @ApiQuery({ name: 'status', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(
      user.accountId,
      Number(page) || 1,
      Number(limit) || 20,
      status ? Number(status) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team by ID' })
  findById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findById(id, user.accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create team' })
  create(@Body() dto: CreateTeamDto, @CurrentUser() user: RequestUser) {
    return this.service.create(user.accountId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update team' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTeamDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, user.accountId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete team' })
  delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.delete(id, user.accountId);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get all members of a team' })
  findMembers(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findMembers(id, user.accountId);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add a member to a team' })
  addMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { userId: number; roleInTeam?: string },
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.addMember(id, user.accountId, body);
  }
}
