import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MaterialCalculationRepository } from './repositories/material-calculation.repository';
import {
  CreateMaterialCalculationDto,
  UpdateMaterialCalculationDto,
} from './dto';

@Injectable()
export class MaterialCalculationsService {
  constructor(private readonly repo: MaterialCalculationRepository) {}

  async findAll(
    accountId: number,
    options?: {
      page?: number;
      limit?: number;
      projectId?: number;
      calculatorType?: string;
    },
  ) {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [calculations, total] = await Promise.all([
      this.repo.findAll(accountId, {
        skip,
        take: limit,
        projectId: options?.projectId,
        calculatorType: options?.calculatorType,
      }),
      this.repo.count(accountId, {
        projectId: options?.projectId,
        calculatorType: options?.calculatorType,
      }),
    ]);

    return { calculations, total, page, limit };
  }

  async findById(id: number, accountId: number) {
    const calc = await this.repo.findById(id);
    if (!calc) throw new NotFoundException('Material calculation not found');
    if (calc.accountId !== accountId) throw new ForbiddenException('Access denied');
    return calc;
  }

  async create(
    dto: CreateMaterialCalculationDto,
    accountId: number,
    userId?: number,
  ) {
    return this.repo.create({
      ...dto,
      accountId,
      createdByUserId: userId,
    });
  }

  async update(id: number, dto: UpdateMaterialCalculationDto, accountId: number) {
    await this.findById(id, accountId);
    return this.repo.update(id, dto);
  }

  async remove(id: number, accountId: number) {
    await this.findById(id, accountId);
    await this.repo.delete(id);
  }
}
