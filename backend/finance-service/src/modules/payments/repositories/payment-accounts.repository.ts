import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreatePaymentAccountDto } from '../dto/create-payment-account.dto';
import { UpdatePaymentAccountDto } from '../dto/update-payment-account.dto';

@Injectable()
export class PaymentAccountsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(accountId: number, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      (this.prisma as any).paymentAccount.findMany({
        where: { accountId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).paymentAccount.count({ where: { accountId } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).paymentAccount.findFirst({
      where: { id, accountId },
      include: { payments: true },
    });
  }

  async create(accountId: number, dto: CreatePaymentAccountDto) {
    return (this.prisma as any).paymentAccount.create({
      data: { ...dto, accountId },
    });
  }

  async update(id: number, accountId: number, dto: UpdatePaymentAccountDto) {
    return (this.prisma as any).paymentAccount
      .updateMany({
        where: { id, accountId },
        data: dto,
      })
      .then(async () => {
        return (this.prisma as any).paymentAccount.findFirst({
          where: { id, accountId },
        });
      });
  }

  async delete(id: number, accountId: number) {
    return (this.prisma as any).paymentAccount.deleteMany({
      where: { id, accountId },
    });
  }
}
