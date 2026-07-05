import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ProxyService } from '../../common/services/proxy.service';
import { Public } from '../../common/decorators/public.decorator';
import { SHARE_REGISTRY } from './share-registry';
import { AnyRole } from '../../common/decorators/roles.decorator';

// Внутренний read-only «гость»: observer-роль (13), чтобы не триггерить
// клиентскую фильтрацию проектов (она завязана на roleId 15).
const SHARE_GUEST_ROLE_ID = 13;
const SHARE_GUEST_SUB = -1;
const SHARE_TOKEN_TTL = '60s';

@ApiTags('Share')
@ApiBearerAuth()
@AnyRole()
@Controller('api/v1')
export class ShareGatewayController {
  private readonly logger = new Logger(ShareGatewayController.name);

  constructor(
    private readonly proxyService: ProxyService,
    private readonly jwtService: JwtService,
  ) {}

  // ---- Управление ссылками (авторизованный пользователь) ----

  @Get('share-links')
  @ApiOperation({ summary: 'List share links' })
  listLinks(
    @Req() req: Request,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.proxyService.forward('clients', {
      method: 'GET',
      path: '/share-links',
      headers: { authorization: req.headers.authorization || '' },
      params: { entityType, entityId },
    });
  }

  @Post('share-links')
  @ApiOperation({ summary: 'Create share link' })
  createLink(@Req() req: Request, @Body() body: unknown) {
    return this.proxyService.forward('clients', {
      method: 'POST',
      path: '/share-links',
      data: body,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Delete('share-links/:id')
  @ApiOperation({ summary: 'Revoke share link' })
  revokeLink(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('clients', {
      method: 'DELETE',
      path: `/share-links/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // ---- Публичный резолвер (без авторизации) ----

  @Public()
  @Get('share/:token')
  @ApiOperation({ summary: 'Resolve a share link and return the entity (public)' })
  async resolve(@Param('token') token: string) {
    // 1) токен → { entityType, entityId, accountId } (валидация revoke/expiry в clients-service)
    const link = await this.proxyService.forward<{
      entityType: string;
      entityId: number;
      accountId: number;
      title: string | null;
      createdByUserId: number | null;
    }>('clients', {
      method: 'GET',
      path: `/share-links/resolve/${encodeURIComponent(token)}`,
    });

    // 2) тип из whitelist?
    const target = SHARE_REGISTRY[link.entityType];
    if (!target) {
      throw new NotFoundException('Тип сущности недоступен для публичного доступа');
    }

    // 3) короткоживущий внутренний JWT, ограниченный аккаунтом ссылки
    const internalToken = this.jwtService.sign(
      {
        sub: link.createdByUserId || SHARE_GUEST_SUB,
        roleId: SHARE_GUEST_ROLE_ID,
        accountId: link.accountId,
        share: true,
      },
      { expiresIn: SHARE_TOKEN_TTL },
    );

    // 4) проксируем чтение сущности
    let entity: unknown = null;
    try {
      entity = await this.proxyService.forward(target.service, {
        method: 'GET',
        path: target.path(link.entityId),
        headers: { authorization: `Bearer ${internalToken}` },
      });
    } catch (e) {
      this.logger.warn(
        `Share resolve failed for ${link.entityType}#${link.entityId}: ${
          (e as Error)?.message
        }`,
      );
      throw new NotFoundException('Содержимое недоступно');
    }

    return {
      entityType: link.entityType,
      label: target.label,
      title: link.title,
      entity,
    };
  }
}
