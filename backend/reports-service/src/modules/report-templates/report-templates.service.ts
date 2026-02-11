import { Injectable, NotFoundException } from '@nestjs/common';
import { ReportTemplateRepository } from './repositories/report-template.repository';
import { CreateReportTemplateDto } from './dto/create-report-template.dto';
import { UpdateReportTemplateDto } from './dto/update-report-template.dto';

@Injectable()
export class ReportTemplatesService {
  constructor(
    private readonly reportTemplateRepository: ReportTemplateRepository,
  ) {}

  async findAll(accountId: number, page: number, limit: number) {
    return this.reportTemplateRepository.findAll(accountId, page, limit);
  }

  async findById(id: number, accountId: number) {
    const template = await this.reportTemplateRepository.findById(
      id,
      accountId,
    );
    if (!template) {
      throw new NotFoundException(`Report template with ID ${id} not found`);
    }
    return template;
  }

  async create(accountId: number, dto: CreateReportTemplateDto) {
    return this.reportTemplateRepository.create(accountId, dto);
  }

  async update(id: number, accountId: number, dto: UpdateReportTemplateDto) {
    await this.findById(id, accountId);
    return this.reportTemplateRepository.update(id, accountId, dto);
  }

  async delete(id: number, accountId: number) {
    await this.findById(id, accountId);
    return this.reportTemplateRepository.delete(id, accountId);
  }
}
