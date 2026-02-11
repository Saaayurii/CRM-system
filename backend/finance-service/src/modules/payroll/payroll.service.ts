import { Injectable, NotFoundException } from '@nestjs/common';
import { PayrollRepository } from './repositories/payroll.repository';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { UpdatePayrollDto } from './dto/update-payroll.dto';

@Injectable()
export class PayrollService {
  constructor(private readonly payrollRepository: PayrollRepository) {}

  async findAll(
    accountId: number,
    page: number,
    limit: number,
    filters?: { userId?: number; payrollPeriod?: string; status?: number },
  ) {
    return this.payrollRepository.findAll(accountId, page, limit, filters);
  }

  async findById(id: number, accountId: number) {
    const payroll = await this.payrollRepository.findById(id, accountId);
    if (!payroll) {
      throw new NotFoundException(`Payroll with ID ${id} not found`);
    }
    return payroll;
  }

  async create(accountId: number, dto: CreatePayrollDto) {
    return this.payrollRepository.create(accountId, dto);
  }

  async update(id: number, accountId: number, dto: UpdatePayrollDto) {
    await this.findById(id, accountId);
    return this.payrollRepository.update(id, accountId, dto);
  }

  async delete(id: number, accountId: number) {
    await this.findById(id, accountId);
    return this.payrollRepository.delete(id, accountId);
  }
}
