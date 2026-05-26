import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SafetyBriefingsRepository } from './repositories/safety-briefings.repository';
import {
  CreateSafetyBriefingDto,
  UpdateSafetyBriefingDto,
  SignBriefingDto,
} from './dto';

@Injectable()
export class SafetyBriefingsService {
  constructor(private readonly repository: SafetyBriefingsRepository) {}

  async findAll(
    accountId: number,
    filters: {
      page: number;
      limit: number;
      status?: string;
      briefingType?: string;
      projectId?: number;
    },
  ) {
    return this.repository.findAll(accountId, filters);
  }

  async findById(id: number, accountId: number) {
    const briefing = await this.repository.findById(id, accountId);
    if (!briefing) {
      throw new NotFoundException(`Safety briefing #${id} not found`);
    }
    return briefing;
  }

  async create(
    accountId: number,
    dto: CreateSafetyBriefingDto,
    userId?: number,
  ) {
    if (!accountId) throw new BadRequestException('accountId required');
    return this.repository.create(accountId, dto, userId);
  }

  async update(id: number, accountId: number, dto: UpdateSafetyBriefingDto) {
    await this.findById(id, accountId);
    return this.repository.update(id, accountId, dto);
  }

  async remove(id: number, accountId: number) {
    await this.findById(id, accountId);
    await this.repository.softDelete(id, accountId);
    return { ok: true, id };
  }

  async addParticipant(
    briefingId: number,
    accountId: number,
    payload: { userId: number; userName?: string; userPosition?: string },
  ) {
    const result = await this.repository.addParticipant(
      briefingId,
      accountId,
      payload,
    );
    if (!result) throw new NotFoundException(`Briefing #${briefingId} not found`);
    return result;
  }

  async removeParticipant(
    briefingId: number,
    participantId: number,
    accountId: number,
  ) {
    await this.findById(briefingId, accountId);
    await this.repository.removeParticipant(briefingId, participantId);
    return { ok: true };
  }

  async sign(
    briefingId: number,
    accountId: number,
    userId: number,
    dto: SignBriefingDto,
    ip?: string,
  ) {
    const briefing = await this.findById(briefingId, accountId);
    const participant = await this.repository.findParticipant(
      briefingId,
      userId,
    );
    if (!participant) {
      throw new BadRequestException(
        `User #${userId} is not listed as participant of briefing #${briefingId}`,
      );
    }

    // Validate signature format
    if (!dto.signatureData?.startsWith('data:image/')) {
      throw new BadRequestException(
        'signatureData must be base64 data URL (data:image/...)',
      );
    }

    let validUntil: Date | null = null;
    if (briefing.validityMonths && briefing.validityMonths > 0) {
      const base = briefing.conductedAt
        ? new Date(briefing.conductedAt)
        : new Date();
      validUntil = new Date(base);
      validUntil.setMonth(validUntil.getMonth() + briefing.validityMonths);
    }

    await this.repository.signParticipant(briefingId, userId, {
      signatureData: dto.signatureData,
      signatureIp: ip,
      notes: dto.notes,
      validUntil,
    });

    return this.findById(briefingId, accountId);
  }

  async markConducted(id: number, accountId: number) {
    await this.findById(id, accountId);
    await this.repository.markConducted(id, accountId);
    return this.findById(id, accountId);
  }

  async markCompleted(id: number, accountId: number) {
    await this.findById(id, accountId);
    await this.repository.markCompleted(id, accountId);
    return this.findById(id, accountId);
  }

  async getUserStatus(accountId: number, userId: number) {
    const valid = await this.repository.findUserValidBriefings(accountId, userId);
    // Сгруппируем по типу — берём последний валидный по каждому типу
    const byType: Record<string, any> = {};
    for (const p of valid) {
      const type = p.briefing?.briefingType ?? 'unknown';
      if (!byType[type]) byType[type] = p;
    }
    return { userId, validByType: byType, all: valid };
  }

  async getUserMissing(
    accountId: number,
    userId: number,
    requiredTypes: string[],
  ) {
    if (!requiredTypes?.length) return { missing: [], details: [] };
    const status = await this.getUserStatus(accountId, userId);
    const present = Object.keys(status.validByType);
    const missing = requiredTypes.filter((t) => !present.includes(t));
    return { missing, present, details: status.validByType };
  }

  async expiringSoon(accountId: number, withinDays = 14) {
    return this.repository.listExpiringSoon(accountId, withinDays);
  }
}
