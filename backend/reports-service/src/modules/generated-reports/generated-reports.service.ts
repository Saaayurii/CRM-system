import { Injectable, NotFoundException } from '@nestjs/common';
import { GeneratedReportRepository } from './repositories/generated-report.repository';
import { CreateGeneratedReportDto } from './dto/create-generated-report.dto';
import { UpdateGeneratedReportDto } from './dto/update-generated-report.dto';

@Injectable()
export class GeneratedReportsService {
  constructor(private readonly generatedReportRepository: GeneratedReportRepository) {}

  async findAll(
    accountId: number,
    page: number,
    limit: number,
    filters?: { projectId?: number; reportTemplateId?: number },
  ) {
    return this.generatedReportRepository.findAll(accountId, page, limit, filters);
  }

  async findById(id: number, accountId: number) {
    const report = await this.generatedReportRepository.findById(id, accountId);
    if (!report) {
      throw new NotFoundException(`Generated report with ID ${id} not found`);
    }
    return report;
  }

  async create(accountId: number, dto: CreateGeneratedReportDto) {
    return this.generatedReportRepository.create(accountId, dto);
  }

  async update(id: number, accountId: number, dto: UpdateGeneratedReportDto) {
    await this.findById(id, accountId);
    return this.generatedReportRepository.update(id, accountId, dto);
  }

  async delete(id: number, accountId: number) {
    await this.findById(id, accountId);
    return this.generatedReportRepository.delete(id, accountId);
  }
}
