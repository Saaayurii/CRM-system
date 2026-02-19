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
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CalendarEventsService } from './calendar-events.service';
import { CreateCalendarEventDto, UpdateCalendarEventDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Calendar Events')
@ApiBearerAuth()
@Controller('calendar-events')
export class CalendarEventsController {
  constructor(private readonly calendarEventsService: CalendarEventsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all calendar events' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'projectId', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Calendar events retrieved' })
  findAll(
    @CurrentUser('accountId') accountId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('projectId') projectId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.calendarEventsService.findAll(
      accountId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      {
        projectId: projectId ? parseInt(projectId, 10) : undefined,
        startDate,
        endDate,
      },
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get calendar event by ID' })
  @ApiResponse({ status: 200, description: 'Calendar event retrieved' })
  @ApiResponse({ status: 404, description: 'Calendar event not found' })
  findById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.calendarEventsService.findById(id, accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create calendar event' })
  @ApiResponse({ status: 201, description: 'Calendar event created' })
  create(
    @CurrentUser('accountId') accountId: number,
    @Body() dto: CreateCalendarEventDto,
  ) {
    return this.calendarEventsService.create(accountId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update calendar event' })
  @ApiResponse({ status: 200, description: 'Calendar event updated' })
  @ApiResponse({ status: 404, description: 'Calendar event not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
    @Body() dto: UpdateCalendarEventDto,
  ) {
    return this.calendarEventsService.update(id, accountId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete calendar event' })
  @ApiResponse({ status: 200, description: 'Calendar event deleted' })
  @ApiResponse({ status: 404, description: 'Calendar event not found' })
  delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.calendarEventsService.delete(id, accountId);
  }
}
