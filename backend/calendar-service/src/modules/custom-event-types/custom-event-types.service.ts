import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCustomEventTypeDto, UpdateCustomEventTypeDto } from './dto';

@Injectable()
export class CustomEventTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(accountId: number) {
    return (this.prisma as any).calendarCustomEventType.findMany({
      where: { accountId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findById(id: number, accountId: number) {
    const item = await (this.prisma as any).calendarCustomEventType.findFirst({
      where: { id, accountId },
    });
    if (!item) throw new NotFoundException(`Custom type ${id} not found`);
    return item;
  }

  async create(accountId: number, dto: CreateCustomEventTypeDto) {
    const exists = await (this.prisma as any).calendarCustomEventType.findFirst({
      where: { accountId, code: dto.code },
    });
    if (exists) throw new ConflictException(`Код "${dto.code}" уже существует`);
    return (this.prisma as any).calendarCustomEventType.create({
      data: {
        accountId,
        code: dto.code,
        name: dto.name,
        colorHex: dto.colorHex ?? '#3b82f6',
        icon: dto.icon,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(id: number, accountId: number, dto: UpdateCustomEventTypeDto) {
    await this.findById(id, accountId);
    await (this.prisma as any).calendarCustomEventType.update({
      where: { id },
      data: dto,
    });
    return this.findById(id, accountId);
  }

  async delete(id: number, accountId: number) {
    await this.findById(id, accountId);
    await (this.prisma as any).calendarCustomEventType.delete({ where: { id } });
    return { message: 'Deleted' };
  }
}
