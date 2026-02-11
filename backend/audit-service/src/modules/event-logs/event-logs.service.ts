import { Injectable, NotFoundException } from '@nestjs/common';
import { EventLogRepository } from './repositories/event-log.repository';
import { CreateEventLogDto } from './dto/create-event-log.dto';

@Injectable()
export class EventLogsService {
  constructor(private readonly eventLogRepository: EventLogRepository) {}

  async findAll(accountId: number, page: number, limit: number, entityType?: string, userId?: number) {
    return this.eventLogRepository.findAll(accountId, page, limit, entityType, userId);
  }

  async findById(id: number, accountId: number) {
    const log = await this.eventLogRepository.findById(id, accountId);
    if (!log) throw new NotFoundException(`Event log with ID ${id} not found`);
    return log;
  }

  async create(accountId: number, dto: CreateEventLogDto) {
    return this.eventLogRepository.create(accountId, dto);
  }
}
