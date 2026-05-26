import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { ClientInvitesService } from './client-invites.service';
import { CreateClientInviteDto } from './dto/create-client-invite.dto';
import { AcceptClientInviteDto } from './dto/accept-client-invite.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Client Invites')
@Controller('client-invites')
export class ClientInvitesController {
  constructor(private readonly svc: ClientInvitesService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List client invites for current account' })
  list(@CurrentUser('accountId') accountId: number) {
    return this.svc.list(accountId);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a client invite token' })
  create(
    @Body() dto: CreateClientInviteDto,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('userId') userId: number,
  ) {
    return this.svc.create(accountId, userId, dto);
  }

  @Delete(':token')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a client invite' })
  revoke(
    @Param('token') token: string,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.svc.revoke(accountId, token);
  }

  @Public()
  @Get(':token/check')
  @ApiOperation({ summary: 'Check that an invite is valid (public)' })
  check(@Param('token') token: string) {
    return this.svc.check(token);
  }

  @Public()
  @Post(':token/accept')
  @ApiOperation({ summary: 'Accept an invite and create client + portal user (public)' })
  accept(
    @Param('token') token: string,
    @Body() dto: AcceptClientInviteDto,
    @Req() req: Request,
  ) {
    const authHeader = req.headers['authorization'] as string | undefined;
    return this.svc.accept(token, dto, authHeader);
  }
}
