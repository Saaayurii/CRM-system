import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { CalendarEventRepository } from './repositories/calendar-event.repository';
import { CreateCalendarEventDto, UpdateCalendarEventDto } from './dto';

@Injectable()
export class CalendarEventsService {
  private readonly logger = new Logger(CalendarEventsService.name);

  constructor(
    private readonly calendarEventRepository: CalendarEventRepository,
  ) {}

  async findAll(
    accountId: number,
    page: number = 1,
    limit: number = 20,
    filters?: {
      projectId?: number;
      startDate?: string;
      endDate?: string;
    },
  ) {
    return this.calendarEventRepository.findAll(accountId, page, limit, filters);
  }

  async findById(id: number, accountId: number) {
    const event = await this.calendarEventRepository.findById(id, accountId);
    if (!event) {
      throw new NotFoundException(`Calendar event with ID ${id} not found`);
    }
    return event;
  }

  async create(accountId: number, dto: CreateCalendarEventDto) {
    return this.calendarEventRepository.create({
      accountId,
      title: dto.title,
      description: dto.description,
      eventType: dto.eventType,
      startDatetime: new Date(dto.startDatetime),
      endDatetime: dto.endDatetime ? new Date(dto.endDatetime) : null,
      isAllDay: dto.isAllDay || false,
      location: dto.location,
      organizerId: dto.organizerId,
      participants: dto.participants || [],
      reminders: dto.reminders || [],
      status: dto.status || 'scheduled',
      recurrenceRule: dto.recurrenceRule,
      projectId: dto.projectId,
      constructionSiteId: dto.constructionSiteId,
      taskId: dto.taskId,
    });
  }

  async update(id: number, accountId: number, dto: UpdateCalendarEventDto) {
    await this.findById(id, accountId);
    const updateData: any = { ...dto };
    if (dto.startDatetime) {
      updateData.startDatetime = new Date(dto.startDatetime);
    }
    if (dto.endDatetime) {
      updateData.endDatetime = new Date(dto.endDatetime);
    }
    await this.calendarEventRepository.update(id, accountId, updateData);
    return this.findById(id, accountId);
  }

  async delete(id: number, accountId: number) {
    await this.findById(id, accountId);
    await this.calendarEventRepository.delete(id, accountId);
    return { message: `Calendar event with ID ${id} deleted successfully` };
  }
}
