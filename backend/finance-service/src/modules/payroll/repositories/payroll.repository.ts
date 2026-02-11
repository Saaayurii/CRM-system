import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreatePayrollDto } from '../dto/create-payroll.dto';
import { UpdatePayrollDto } from '../dto/update-payroll.dto';

@Injectable()
export class PayrollRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    accountId: number,
    page: number = 1,
    limit: number = 20,
    filters?: { userId?: number; payrollPeriod?: string; status?: number },
  ) {
    const skip = (page - 1) * limit;
    const where: any = { accountId };

    if (filters?.userId) {
      where.userId = filters.userId;
    }
    if (filters?.payrollPeriod) {
      where.payrollPeriod = filters.payrollPeriod;
    }
    if (filters?.status !== undefined && filters?.status !== null) {
      where.status = filters.status;
    }

    const [data, total] = await Promise.all([
      (this.prisma as any).payroll.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).payroll.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).payroll.findFirst({
      where: { id, accountId },
    });
  }

  async create(accountId: number, dto: CreatePayrollDto) {
    const data: any = { ...dto, accountId };
    if (dto.paymentDate) {
      data.paymentDate = new Date(dto.paymentDate);
    }
    return (this.prisma as any).payroll.create({ data });
  }

  async update(id: number, accountId: number, dto: UpdatePayrollDto) {
    const data: any = { ...dto };
    if (dto.paymentDate) {
      data.paymentDate = new Date(dto.paymentDate);
    }
    return (this.prisma as any).payroll.updateMany({
      where: { id, accountId },
      data,
    }).then(async () => {
      return (this.prisma as any).payroll.findFirst({ where: { id, accountId } });
    });
  }

  async delete(id: number, accountId: number) {
    return (this.prisma as any).payroll.deleteMany({
      where: { id, accountId },
    });
  }
}
