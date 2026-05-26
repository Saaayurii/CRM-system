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
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SafetyBriefingsService } from './safety-briefings.service';
import {
  CreateSafetyBriefingDto,
  UpdateSafetyBriefingDto,
  SignBriefingDto,
} from './dto';

interface RequestUser {
  id: number;
  email: string;
  roleId: number;
  accountId: number;
}

@ApiTags('Safety Briefings')
@ApiBearerAuth()
@Controller()
export class SafetyBriefingsController {
  constructor(private readonly service: SafetyBriefingsService) {}

  @Get('safety-briefings')
  @ApiOperation({ summary: 'List safety briefings' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'briefingType', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('briefingType') briefingType?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.service.findAll(user.accountId, {
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      status,
      briefingType,
      projectId: projectId ? Number(projectId) : undefined,
    });
  }

  @Get('safety-briefings/expiring-soon')
  @ApiOperation({ summary: 'List briefings whose signatures expire soon' })
  @ApiQuery({ name: 'days', required: false })
  expiringSoon(
    @CurrentUser() user: RequestUser,
    @Query('days') days?: string,
  ) {
    return this.service.expiringSoon(user.accountId, Number(days) || 14);
  }

  @Get('safety-briefings/users/:userId/status')
  @ApiOperation({
    summary: 'Get user briefing status — valid signatures by type',
  })
  userStatus(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.service.getUserStatus(user.accountId, userId);
  }

  @Get('safety-briefings/users/:userId/missing')
  @ApiOperation({
    summary: 'Given required briefing types, return missing for a user',
  })
  @ApiQuery({
    name: 'types',
    required: true,
    description: 'Comma-separated list of briefing types',
  })
  userMissing(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseIntPipe) userId: number,
    @Query('types') typesCsv: string,
  ) {
    const requiredTypes = (typesCsv || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return this.service.getUserMissing(user.accountId, userId, requiredTypes);
  }

  @Get('safety-briefings/:id')
  @ApiOperation({ summary: 'Get safety briefing' })
  findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.findById(id, user.accountId);
  }

  @Post('safety-briefings')
  @ApiOperation({ summary: 'Create safety briefing' })
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateSafetyBriefingDto,
  ) {
    return this.service.create(user.accountId, dto, user.id);
  }

  @Put('safety-briefings/:id')
  @ApiOperation({ summary: 'Update safety briefing' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSafetyBriefingDto,
  ) {
    return this.service.update(id, user.accountId, dto);
  }

  @Delete('safety-briefings/:id')
  @ApiOperation({ summary: 'Soft delete safety briefing' })
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.remove(id, user.accountId);
  }

  @Post('safety-briefings/:id/conduct')
  @ApiOperation({ summary: 'Mark briefing as in progress / conducted' })
  conduct(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.markConducted(id, user.accountId);
  }

  @Post('safety-briefings/:id/complete')
  @ApiOperation({ summary: 'Mark briefing as fully completed' })
  complete(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.markCompleted(id, user.accountId);
  }

  @Post('safety-briefings/:id/participants')
  @ApiOperation({ summary: 'Add a participant to a briefing' })
  addParticipant(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { userId: number; userName?: string; userPosition?: string },
  ) {
    return this.service.addParticipant(id, user.accountId, body);
  }

  @Delete('safety-briefings/:id/participants/:participantId')
  @ApiOperation({ summary: 'Remove participant from a briefing' })
  removeParticipant(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('participantId', ParseIntPipe) participantId: number,
  ) {
    return this.service.removeParticipant(id, participantId, user.accountId);
  }

  @Post('safety-briefings/:id/sign')
  @ApiOperation({ summary: 'Current user signs the briefing (canvas signature)' })
  sign(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SignBriefingDto,
    @Req() req: Request,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      undefined;
    return this.service.sign(id, user.accountId, user.id, dto, ip);
  }

  @Post('safety-briefings/:id/sign-on-behalf')
  @ApiOperation({
    summary: 'Instructor signs on behalf of a participant',
  })
  signOnBehalf(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      userId: number;
      signatureData: string;
      notes?: string;
    },
    @Req() req: Request,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      undefined;
    return this.service.sign(
      id,
      user.accountId,
      body.userId,
      { signatureData: body.signatureData, notes: body.notes },
      ip,
    );
  }
}
