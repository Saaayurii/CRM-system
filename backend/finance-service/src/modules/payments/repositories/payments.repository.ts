import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { UpdatePaymentDto } from '../dto/update-payment.dto';

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(accountId: number, page: number = 1, limit: number = 20, projectId?: number) {
    const skip = (page - 1) * limit;
    const where: any = { accountId };
    if (projectId) where.projectId = projectId;
    const [data, total] = await Promise.all([
      (this.prisma as any).payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { paymentAccount: true },
      }),
      (this.prisma as any).payment.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).payment.findFirst({
      where: { id, accountId },
      include: { paymentAccount: true },
    });
  }

  async create(
    accountId: number,
    dto: CreatePaymentDto,
    createdByUserId: number,
  ) {
    const data: any = { ...dto, accountId, createdByUserId };
    if (data.paymentDate && !data.paymentDate.includes('T')) {
      data.paymentDate = new Date(data.paymentDate).toISOString();
    }
    return (this.prisma as any).payment.create({ data });
  }

  async update(id: number, accountId: number, dto: UpdatePaymentDto) {
    const data: any = { ...dto };
    if (data.paymentDate && !data.paymentDate.includes('T')) {
      data.paymentDate = new Date(data.paymentDate).toISOString();
    }
    return (this.prisma as any).payment
      .updateMany({
        where: { id, accountId },
        data,
      })
      .then(async () => {
        return (this.prisma as any).payment.findFirst({
          where: { id, accountId },
        });
      });
  }

  async delete(id: number, accountId: number) {
    return (this.prisma as any).payment.deleteMany({
      where: { id, accountId },
    });
  }
}
