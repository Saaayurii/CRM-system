import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { UpdatePaymentDto } from '../dto/update-payment.dto';

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(accountId: number, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      (this.prisma as any).payment.findMany({
        where: { accountId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { paymentAccount: true },
      }),
      (this.prisma as any).payment.count({ where: { accountId } }),
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
    return (this.prisma as any).payment.create({
      data: { ...dto, accountId, createdByUserId },
    });
  }

  async update(id: number, accountId: number, dto: UpdatePaymentDto) {
    return (this.prisma as any).payment
      .updateMany({
        where: { id, accountId },
        data: dto,
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
