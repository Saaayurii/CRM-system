import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateWorkTemplateDto } from '../dto/create-work-template.dto';
import { UpdateWorkTemplateDto } from '../dto/update-work-template.dto';

@Injectable()
export class WorkTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(accountId: number, page = 1, limit = 100, search?: string, category?: string) {
    const skip = (page - 1) * limit;
    const where: any = { accountId };
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      (this.prisma as any).workTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      }),
      (this.prisma as any).workTemplate.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).workTemplate.findFirst({ where: { id, accountId } });
  }

  async create(accountId: number, dto: CreateWorkTemplateDto) {
    return (this.prisma as any).workTemplate.create({ data: { ...dto, accountId } });
  }

  async update(id: number, accountId: number, dto: UpdateWorkTemplateDto) {
    await (this.prisma as any).workTemplate.updateMany({ where: { id, accountId }, data: dto });
    return (this.prisma as any).workTemplate.findFirst({ where: { id, accountId } });
  }

  async delete(id: number, accountId: number) {
    return (this.prisma as any).workTemplate.deleteMany({ where: { id, accountId } });
  }

  async categories(accountId: number): Promise<string[]> {
    const rows = await (this.prisma as any).workTemplate.findMany({
      where: { accountId, category: { not: null } },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return rows.map((r: any) => r.category).filter(Boolean);
  }
}
