import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateClientDto } from '../dto/create-client.dto';
import { UpdateClientDto } from '../dto/update-client.dto';

@Injectable()
export class ClientsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    accountId: number,
    page: number = 1,
    limit: number = 20,
    status?: string,
    managerId?: number,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { accountId };
    if (status) where.status = status;
    if (managerId) where.assignedManagerId = managerId;
    const [data, total] = await Promise.all([
      (this.prisma as any).client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).client.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).client.findFirst({
      where: { id, accountId },
      include: { interactions: true, portalAccess: true },
    });
  }

  async create(accountId: number, dto: CreateClientDto) {
    return (this.prisma as any).client.create({ data: { ...dto, accountId } });
  }

  async update(id: number, accountId: number, dto: UpdateClientDto) {
    return (this.prisma as any).client
      .updateMany({ where: { id, accountId }, data: { ...dto } })
      .then(async () => {
        return (this.prisma as any).client.findFirst({
          where: { id, accountId },
        });
      });
  }

  async delete(id: number, accountId: number) {
    return (this.prisma as any).client.deleteMany({ where: { id, accountId } });
  }
}
