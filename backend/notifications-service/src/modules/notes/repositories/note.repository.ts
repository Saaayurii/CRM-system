import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class NoteRepository {
  private readonly logger = new Logger(NoteRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(accountId: number, userId: number, status?: string) {
    const where: any = { accountId, userId };
    if (status === 'active') {
      where.dismissedAt = null;
    } else if (status === 'history') {
      where.dismissedAt = { not: null };
    }

    return (this.prisma as any).note.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Notes that should pop up now: reminder reached and not dismissed. */
  async findDue(accountId: number, userId: number) {
    return (this.prisma as any).note.findMany({
      where: {
        accountId,
        userId,
        dismissedAt: null,
        remindAt: { not: null, lte: new Date() },
      },
      orderBy: { remindAt: 'asc' },
    });
  }

  async findById(id: number, accountId: number, userId: number) {
    return (this.prisma as any).note.findFirst({
      where: { id, accountId, userId },
    });
  }

  async create(data: any) {
    return (this.prisma as any).note.create({ data });
  }

  async update(id: number, accountId: number, userId: number, data: any) {
    await (this.prisma as any).note.updateMany({
      where: { id, accountId, userId },
      data,
    });
    return this.findById(id, accountId, userId);
  }

  async remove(id: number, accountId: number, userId: number) {
    return (this.prisma as any).note.deleteMany({
      where: { id, accountId, userId },
    });
  }
}
