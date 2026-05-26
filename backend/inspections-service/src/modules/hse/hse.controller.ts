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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { HseService } from './hse.service';

interface RequestUser {
  id: number;
  email: string;
  roleId: number;
  accountId: number;
}

function buildFilters(query: any) {
  return {
    page: query.page ? parseInt(String(query.page), 10) : 1,
    limit: query.limit ? parseInt(String(query.limit), 10) : 20,
    status: query.status as string | undefined,
    projectId:
      query.projectId !== undefined ? Number(query.projectId) : undefined,
  };
}

@ApiTags('HSE Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hse')
export class HseDashboardController {
  constructor(private readonly service: HseService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Aggregated HSE dashboard summary' })
  summary(@CurrentUser() user: RequestUser) {
    return this.service.dashboardSummary(user.accountId);
  }
}

@ApiTags('HSE Risks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hse-risks')
export class HseRisksController {
  constructor(private readonly service: HseService) {}

  @Get()
  findAll(@CurrentUser() user: RequestUser, @Query() q: any) {
    return this.service.risksFindAll(user.accountId, buildFilters(q));
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.risksFindOne(id, user.accountId);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: any) {
    return this.service.risksCreate(user.accountId, dto, user.id);
  }

  @Put(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: any,
  ) {
    return this.service.risksUpdate(id, user.accountId, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.risksDelete(id, user.accountId);
  }
}

@ApiTags('HSE Incidents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hse-incidents')
export class HseIncidentsController {
  constructor(private readonly service: HseService) {}

  @Get()
  findAll(@CurrentUser() user: RequestUser, @Query() q: any) {
    return this.service.incidentsFindAll(user.accountId, buildFilters(q));
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.incidentsFindOne(id, user.accountId);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: any) {
    return this.service.incidentsCreate(user.accountId, dto, user.id);
  }

  @Put(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: any,
  ) {
    return this.service.incidentsUpdate(id, user.accountId, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.incidentsDelete(id, user.accountId);
  }
}

@ApiTags('HSE Permits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hse-permits')
export class HsePermitsController {
  constructor(private readonly service: HseService) {}

  @Get()
  findAll(@CurrentUser() user: RequestUser, @Query() q: any) {
    return this.service.permitsFindAll(user.accountId, buildFilters(q));
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.permitsFindOne(id, user.accountId);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: any) {
    return this.service.permitsCreate(user.accountId, dto, user.id);
  }

  @Put(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: any,
  ) {
    return this.service.permitsUpdate(id, user.accountId, dto);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve permit' })
  approve(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.permitsApprove(id, user.accountId, user.id);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close permit (work completed)' })
  close(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { closingNotes?: string },
  ) {
    return this.service.permitsClose(id, user.accountId, body?.closingNotes);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.permitsDelete(id, user.accountId);
  }
}

@ApiTags('HSE Violations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hse-violations')
export class HseViolationsController {
  constructor(private readonly service: HseService) {}

  @Get()
  findAll(@CurrentUser() user: RequestUser, @Query() q: any) {
    return this.service.violationsFindAll(user.accountId, buildFilters(q));
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.violationsFindOne(id, user.accountId);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: any) {
    return this.service.violationsCreate(user.accountId, dto, user.id);
  }

  @Put(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: any,
  ) {
    return this.service.violationsUpdate(id, user.accountId, dto);
  }

  @Post(':id/resolve')
  resolve(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { resolutionNotes?: string },
  ) {
    return this.service.violationsResolve(
      id,
      user.accountId,
      body?.resolutionNotes,
    );
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.violationsDelete(id, user.accountId);
  }
}

@ApiTags('HSE Corrective Actions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hse-corrective-actions')
export class HseCorrectiveActionsController {
  constructor(private readonly service: HseService) {}

  @Get()
  findAll(@CurrentUser() user: RequestUser, @Query() q: any) {
    return this.service.actionsFindAll(user.accountId, buildFilters(q));
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.actionsFindOne(id, user.accountId);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: any) {
    return this.service.actionsCreate(user.accountId, dto, user.id);
  }

  @Put(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: any,
  ) {
    return this.service.actionsUpdate(id, user.accountId, dto);
  }

  @Post(':id/complete')
  complete(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { completionNotes?: string },
  ) {
    return this.service.actionsComplete(
      id,
      user.accountId,
      body?.completionNotes,
    );
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.actionsDelete(id, user.accountId);
  }
}

@ApiTags('HSE Monitoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hse-monitoring')
export class HseMonitoringController {
  constructor(private readonly service: HseService) {}

  @Get()
  findAll(@CurrentUser() user: RequestUser, @Query() q: any) {
    return this.service.monitoringFindAll(user.accountId, buildFilters(q));
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.monitoringFindOne(id, user.accountId);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: any) {
    return this.service.monitoringCreate(user.accountId, dto, user.id);
  }

  @Put(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: any,
  ) {
    return this.service.monitoringUpdate(id, user.accountId, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.monitoringDelete(id, user.accountId);
  }
}
