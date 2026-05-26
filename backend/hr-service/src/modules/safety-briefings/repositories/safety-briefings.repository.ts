import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class SafetyBriefingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get db(): any {
    return this.prisma as any;
  }

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
    const { page, limit, status, briefingType, projectId } = filters;
    const skip = (page - 1) * limit;
    const where: any = { accountId, deletedAt: null };
    if (status) where.status = status;
    if (briefingType) where.briefingType = briefingType;
    if (projectId !== undefined) where.projectId = projectId;

    const [data, total] = await Promise.all([
      this.db.safetyBriefing.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ scheduledAt: 'desc' }, { id: 'desc' }],
        include: {
          topics: { orderBy: { sortOrder: 'asc' } },
          participants: { orderBy: { id: 'asc' } },
        },
      }),
      this.db.safetyBriefing.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number, accountId: number) {
    return this.db.safetyBriefing.findFirst({
      where: { id, accountId, deletedAt: null },
      include: {
        topics: { orderBy: { sortOrder: 'asc' } },
        participants: { orderBy: { id: 'asc' } },
      },
    });
  }

  async create(accountId: number, dto: any, createdByUserId?: number) {
    const {
      topics = [],
      participants = [],
      scheduledAt,
      conductedAt,
      ...rest
    } = dto;
    return this.db.safetyBriefing.create({
      data: {
        accountId,
        createdByUserId: createdByUserId ?? null,
        ...rest,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        conductedAt: conductedAt ? new Date(conductedAt) : null,
        topics: topics.length
          ? {
              create: topics.map((t: any, idx: number) => ({
                topic: t.topic,
                description: t.description ?? null,
                sortOrder: t.sortOrder ?? idx,
              })),
            }
          : undefined,
        participants: participants.length
          ? {
              create: participants.map((p: any) => ({
                userId: p.userId,
                userName: p.userName ?? null,
                userPosition: p.userPosition ?? null,
              })),
            }
          : undefined,
      },
      include: {
        topics: { orderBy: { sortOrder: 'asc' } },
        participants: { orderBy: { id: 'asc' } },
      },
    });
  }

  async update(id: number, accountId: number, dto: any) {
    const { topics, participants, scheduledAt, conductedAt, ...rest } = dto;

    const data: any = { ...rest };
    if (scheduledAt !== undefined) {
      data.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    }
    if (conductedAt !== undefined) {
      data.conductedAt = conductedAt ? new Date(conductedAt) : null;
    }

    await this.db.safetyBriefing.updateMany({
      where: { id, accountId, deletedAt: null },
      data,
    });

    if (Array.isArray(topics)) {
      await this.db.safetyBriefingTopic.deleteMany({
        where: { briefingId: id },
      });
      if (topics.length > 0) {
        await this.db.safetyBriefingTopic.createMany({
          data: topics.map((t: any, idx: number) => ({
            briefingId: id,
            topic: t.topic,
            description: t.description ?? null,
            sortOrder: t.sortOrder ?? idx,
          })),
        });
      }
    }

    return this.findById(id, accountId);
  }

  async softDelete(id: number, accountId: number) {
    return this.db.safetyBriefing.updateMany({
      where: { id, accountId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  async addParticipant(
    briefingId: number,
    accountId: number,
    payload: { userId: number; userName?: string; userPosition?: string },
  ) {
    const briefing = await this.findById(briefingId, accountId);
    if (!briefing) return null;
    return this.db.safetyBriefingParticipant.upsert({
      where: {
        briefingId_userId: { briefingId, userId: payload.userId },
      },
      update: {
        userName: payload.userName ?? null,
        userPosition: payload.userPosition ?? null,
      },
      create: {
        briefingId,
        userId: payload.userId,
        userName: payload.userName ?? null,
        userPosition: payload.userPosition ?? null,
      },
    });
  }

  async removeParticipant(briefingId: number, participantId: number) {
    return this.db.safetyBriefingParticipant.deleteMany({
      where: { id: participantId, briefingId },
    });
  }

  async findParticipant(briefingId: number, userId: number) {
    return this.db.safetyBriefingParticipant.findFirst({
      where: { briefingId, userId },
    });
  }

  async signParticipant(
    briefingId: number,
    userId: number,
    payload: {
      signatureData: string;
      signatureIp?: string;
      notes?: string;
      validUntil?: Date | null;
    },
  ) {
    return this.db.safetyBriefingParticipant.updateMany({
      where: { briefingId, userId },
      data: {
        signatureData: payload.signatureData,
        signatureIp: payload.signatureIp ?? null,
        signedAt: new Date(),
        status: 'signed',
        notes: payload.notes ?? undefined,
        validUntil: payload.validUntil ?? undefined,
      },
    });
  }

  async markConducted(id: number, accountId: number) {
    return this.db.safetyBriefing.updateMany({
      where: { id, accountId, deletedAt: null },
      data: {
        conductedAt: new Date(),
        status: 'in_progress',
      },
    });
  }

  async markCompleted(id: number, accountId: number) {
    return this.db.safetyBriefing.updateMany({
      where: { id, accountId, deletedAt: null },
      data: { status: 'completed' },
    });
  }

  // Все актуальные подписи пользователя по типам инструктажей
  async findUserValidBriefings(accountId: number, userId: number) {
    const now = new Date();
    return this.db.safetyBriefingParticipant.findMany({
      where: {
        userId,
        status: 'signed',
        briefing: { accountId, deletedAt: null },
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
      },
      include: {
        briefing: {
          select: {
            id: true,
            title: true,
            briefingType: true,
            conductedAt: true,
            validityMonths: true,
          },
        },
      },
      orderBy: { signedAt: 'desc' },
    });
  }

  async listExpiringSoon(accountId: number, withinDays: number) {
    const now = new Date();
    const limit = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
    return this.db.safetyBriefingParticipant.findMany({
      where: {
        status: 'signed',
        briefing: { accountId, deletedAt: null },
        validUntil: { gte: now, lte: limit },
      },
      include: {
        briefing: {
          select: { id: true, title: true, briefingType: true, validityMonths: true },
        },
      },
      orderBy: { validUntil: 'asc' },
    });
  }
}
