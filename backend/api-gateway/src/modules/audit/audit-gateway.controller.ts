import {
  Controller,
  Get,
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
import { Roles, MANAGEMENT_ROLES } from '../../common/decorators/roles.decorator';

@ApiTags('Audit')
@ApiBearerAuth()
@Roles(...MANAGEMENT_ROLES)
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class AuditGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  // Event Logs (only GET list, GET :id, POST - no PUT/DELETE)
  @Get('event-logs')
  @ApiOperation({ summary: 'Get all event logs' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllEventLogs(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('audit', {
      method: 'GET',
      path: '/event-logs',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('event-logs/:id')
  @ApiOperation({ summary: 'Get event log by ID' })
  async findOneEventLog(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('audit', {
      method: 'GET',
      path: `/event-logs/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // NB: write-доступ к event-logs наружу НЕ проксируется намеренно.
  // Аудит пишется только сервером: gateway AuditInterceptor → Kafka (топик
  // audit.events) либо прямой internal HTTP POST в audit-service:3017 (минуя
  // этот контроллер). Публичный POST позволял подделывать записи в чужой
  // accountId — удалён.
}
