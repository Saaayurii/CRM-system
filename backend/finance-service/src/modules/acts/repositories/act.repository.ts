import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateActDto } from '../dto/create-act.dto';
import { UpdateActDto } from '../dto/update-act.dto';
import { CreateActItemDto } from '../dto/create-act-item.dto';

@Injectable()
export class ActRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(accountId: number, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      (this.prisma as any).act.findMany({
        where: { accountId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      (this.prisma as any).act.count({ where: { accountId } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).act.findFirst({
      where: { id, accountId },
      include: { items: true },
    });
  }

  async create(accountId: number, dto: CreateActDto, preparedByUserId: number) {
    const data: any = { ...dto, accountId, preparedByUserId };
    if (data.actDate && !data.actDate.includes('T')) {
      data.actDate = new Date(data.actDate).toISOString();
    }
    return (this.prisma as any).act.create({ data });
  }

  async update(id: number, accountId: number, dto: UpdateActDto) {
    const data: any = { ...dto };
    if (data.actDate && !data.actDate.includes('T')) {
      data.actDate = new Date(data.actDate).toISOString();
    }
    return (this.prisma as any).act
      .updateMany({
        where: { id, accountId },
        data,
      })
      .then(async () => {
        return (this.prisma as any).act.findFirst({ where: { id, accountId } });
      });
  }

  async delete(id: number, accountId: number) {
    return (this.prisma as any).act.deleteMany({
      where: { id, accountId },
    });
  }

  async createItem(actId: number, dto: CreateActItemDto) {
    return (this.prisma as any).actItem.create({
      data: { ...dto, actId },
    });
  }
}
