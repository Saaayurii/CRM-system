import {
  Controller,
  Get,
  Post,
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
import { EventLogsService } from './event-logs.service';
import { CreateEventLogDto } from './dto/create-event-log.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

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
  @ApiOperation({ summary: 'Create event log' })
  create(
    @Body() dto: CreateEventLogDto,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.eventLogsService.create(accountId, dto);
  }
}
