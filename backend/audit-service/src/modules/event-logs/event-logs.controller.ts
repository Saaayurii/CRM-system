import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { EventLogsService } from './event-logs.service';
import { CreateEventLogDto } from './dto/create-event-log.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Event Logs')
@ApiBearerAuth()
@Controller('event-logs')
export class EventLogsController {
  constructor(private readonly eventLogsService: EventLogsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all event logs' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'userId', required: false })
  findAll(
    @CurrentUser('accountId') accountId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('entityType') entityType?: string,
    @Query('userId') userId?: number,
  ) {
    return this.eventLogsService.findAll(
      accountId,
      +page,
      +limit,
      entityType,
      userId ? +userId : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event log by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.eventLogsService.findById(id, accountId);
  }

  @Post()
  @Public()
  @ApiOperation({ summary: 'Create event log (internal-only)' })
  create(
    @Req() req: Request,
    @Body() dto: CreateEventLogDto,
    @CurrentUser('accountId') jwtAccountId?: number,
  ) {
    // Этот эндпоинт — только для серверного аудита (gateway AuditInterceptor
    // HTTP-fallback / другие сервисы). Наружу gateway его не проксирует, а сам
    // audit-service слушает 127.0.0.1. Дополнительно: если задан
    // INTERNAL_AUDIT_TOKEN — требуем совпадающий заголовок x-internal-token
    // (защита от записи из скомпрометированного контейнера во внутренней сети).
    const expected = process.env.INTERNAL_AUDIT_TOKEN;
    if (expected) {
      const provided = req.headers['x-internal-token'];
      if (provided !== expected) {
        throw new ForbiddenException('Invalid internal token');
      }
    }
    // accountId из валидного JWT приоритетнее тела (никогда не доверяем
    // accountId из body поверх токена — иначе кросс-тенант подделка).
    const accountId = jwtAccountId ?? dto.accountId ?? 1;
    return this.eventLogsService.create(accountId, dto);
  }
}
