import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { CalendarEventRepository } from './repositories/calendar-event.repository';
import { CreateCalendarEventDto, UpdateCalendarEventDto } from './dto';
import { PrismaService } from '../../database/prisma.service';
import {
  CLIENT_ROLE_ID,
  RequestUser,
  getClientAllowedProjectIds,
} from '../../common/helpers/client-access.helper';

@Injectable()
export class CalendarEventsService {
  private readonly logger = new Logger(CalendarEventsService.name);

  constructor(
    private readonly calendarEventRepository: CalendarEventRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findAll(
    user: RequestUser,
    page: number = 1,
    limit: number = 20,
    filters?: {
      projectId?: number;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const allowedProjectIds = await getClientAllowedProjectIds(this.prisma, user);
    return this.calendarEventRepository.findAll(user.accountId, page, limit, {
      ...filters,
      allowedProjectIds,
    });
  }

  async findById(id: number, user: RequestUser) {
    const event = await this.calendarEventRepository.findById(id, user.accountId);
    if (!event) {
      throw new NotFoundException(`Calendar event with ID ${id} not found`);
    }
    if (user.roleId === CLIENT_ROLE_ID) {
      const allowed = await getClientAllowedProjectIds(this.prisma, user);
      if (!event.projectId || !allowed?.includes(event.projectId)) {
        throw new ForbiddenException('Access denied');
      }
    }
    return event;
  }

  async create(accountId: number, dto: CreateCalendarEventDto) {
    return this.calendarEventRepository.create({
      accountId,
      title: dto.title,
      description: dto.description,
      eventType: dto.eventType,
      customTypeId: dto.customTypeId || null,
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
    const existing = await this.calendarEventRepository.findById(id, accountId);
    if (!existing) throw new NotFoundException(`Calendar event with ID ${id} not found`);
    const updateData: any = { ...dto };
    if (dto.startDatetime) {
      updateData.startDatetime = new Date(dto.startDatetime);
    }
    if (dto.endDatetime) {
      updateData.endDatetime = new Date(dto.endDatetime);
    }
    await this.calendarEventRepository.update(id, accountId, updateData);
    return this.calendarEventRepository.findById(id, accountId);
  }

  async delete(id: number, accountId: number) {
    const existing = await this.calendarEventRepository.findById(id, accountId);
    if (!existing) throw new NotFoundException(`Calendar event with ID ${id} not found`);
    await this.calendarEventRepository.delete(id, accountId);
    return { message: `Calendar event with ID ${id} deleted successfully` };
  }
}
