import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateMaterialCalculationDto,
  UpdateMaterialCalculationDto,
} from '../dto';

@Injectable()
export class MaterialCalculationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    accountId: number,
    options?: {
      skip?: number;
      take?: number;
      projectId?: number;
      calculatorType?: string;
    },
  ) {
    const where: any = { accountId };
    if (options?.projectId !== undefined) where.projectId = options.projectId;
    if (options?.calculatorType) where.calculatorType = options.calculatorType;

    return (this.prisma as any).materialCalculation.findMany({
      where,
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async count(
    accountId: number,
    options?: { projectId?: number; calculatorType?: string },
  ) {
    const where: any = { accountId };
    if (options?.projectId !== undefined) where.projectId = options.projectId;
    if (options?.calculatorType) where.calculatorType = options.calculatorType;
    return (this.prisma as any).materialCalculation.count({ where });
  }

  async findById(id: number) {
    return (this.prisma as any).materialCalculation.findFirst({ where: { id } });
  }

  async create(data: CreateMaterialCalculationDto & { accountId: number }) {
    return (this.prisma as any).materialCalculation.create({
      data: {
        accountId: data.accountId,
        projectId: data.projectId,
        createdByUserId: data.createdByUserId,
        calculatorType: data.calculatorType,
        title: data.title,
        inputs: data.inputs,
        results: data.results,
        warnings: data.warnings ?? [],
        notes: data.notes,
        taskId: data.taskId,
      },
    });
  }

  async update(id: number, data: UpdateMaterialCalculationDto) {
    return (this.prisma as any).materialCalculation.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return (this.prisma as any).materialCalculation.delete({ where: { id } });
  }
}
