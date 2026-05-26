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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ProxyService } from '../../common/services/proxy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Safety Briefings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class SafetyBriefingsGatewayController {
  constructor(private readonly proxy: ProxyService) {}

  private authHeaders(req: Request) {
    return { authorization: req.headers.authorization || '' };
  }

  private jsonHeaders(req: Request) {
    return {
      authorization: req.headers.authorization || '',
      'content-type': 'application/json',
    };
  }

  @Get('safety-briefings')
  list(@Req() req: Request, @Query() q: any) {
    return this.proxy.forward('hr', {
      method: 'GET',
      path: '/safety-briefings',
      headers: this.authHeaders(req),
      params: q,
    });
  }

  @Get('safety-briefings/expiring-soon')
  expiringSoon(@Req() req: Request, @Query('days') days?: string) {
    return this.proxy.forward('hr', {
      method: 'GET',
      path: '/safety-briefings/expiring-soon',
      headers: this.authHeaders(req),
      params: { days },
    });
  }

  @Get('safety-briefings/users/:userId/status')
  userStatus(@Req() req: Request, @Param('userId') userId: string) {
    return this.proxy.forward('hr', {
      method: 'GET',
      path: `/safety-briefings/users/${userId}/status`,
      headers: this.authHeaders(req),
    });
  }

  @Get('safety-briefings/users/:userId/missing')
  userMissing(
    @Req() req: Request,
    @Param('userId') userId: string,
    @Query('types') types?: string,
  ) {
    return this.proxy.forward('hr', {
      method: 'GET',
      path: `/safety-briefings/users/${userId}/missing`,
      headers: this.authHeaders(req),
      params: { types },
    });
  }

  @Get('safety-briefings/:id')
  get(@Req() req: Request, @Param('id') id: string) {
    return this.proxy.forward('hr', {
      method: 'GET',
      path: `/safety-briefings/${id}`,
      headers: this.authHeaders(req),
    });
  }

  @Post('safety-briefings')
  create(@Req() req: Request, @Body() body: any) {
    return this.proxy.forward('hr', {
      method: 'POST',
      path: '/safety-briefings',
      headers: this.jsonHeaders(req),
      data: body,
    });
  }

  @Put('safety-briefings/:id')
  update(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxy.forward('hr', {
      method: 'PUT',
      path: `/safety-briefings/${id}`,
      headers: this.jsonHeaders(req),
      data: body,
    });
  }

  @Delete('safety-briefings/:id')
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.proxy.forward('hr', {
      method: 'DELETE',
      path: `/safety-briefings/${id}`,
      headers: this.authHeaders(req),
    });
  }

  @Post('safety-briefings/:id/conduct')
  conduct(@Req() req: Request, @Param('id') id: string) {
    return this.proxy.forward('hr', {
      method: 'POST',
      path: `/safety-briefings/${id}/conduct`,
      headers: this.jsonHeaders(req),
      data: {},
    });
  }

  @Post('safety-briefings/:id/complete')
  complete(@Req() req: Request, @Param('id') id: string) {
    return this.proxy.forward('hr', {
      method: 'POST',
      path: `/safety-briefings/${id}/complete`,
      headers: this.jsonHeaders(req),
      data: {},
    });
  }

  @Post('safety-briefings/:id/participants')
  addParticipant(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxy.forward('hr', {
      method: 'POST',
      path: `/safety-briefings/${id}/participants`,
      headers: this.jsonHeaders(req),
      data: body,
    });
  }

  @Delete('safety-briefings/:id/participants/:participantId')
  removeParticipant(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('participantId') participantId: string,
  ) {
    return this.proxy.forward('hr', {
      method: 'DELETE',
      path: `/safety-briefings/${id}/participants/${participantId}`,
      headers: this.authHeaders(req),
    });
  }

  @Post('safety-briefings/:id/sign')
  @ApiOperation({ summary: 'Sign briefing (current user, canvas signature)' })
  sign(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxy.forward('hr', {
      method: 'POST',
      path: `/safety-briefings/${id}/sign`,
      headers: this.jsonHeaders(req),
      data: body,
    });
  }

  @Post('safety-briefings/:id/sign-on-behalf')
  signOnBehalf(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxy.forward('hr', {
      method: 'POST',
      path: `/safety-briefings/${id}/sign-on-behalf`,
      headers: this.jsonHeaders(req),
      data: body,
    });
  }
}
