import { Injectable, NotFoundException } from '@nestjs/common';
import { DefectRepository } from './repositories/defect.repository';
import {
  CreateDefectDto,
  UpdateDefectDto,
  CreateDefectTemplateDto,
  UpdateDefectTemplateDto,
} from './dto';

@Injectable()
export class DefectsService {
  constructor(private readonly defectRepository: DefectRepository) {}

  async findAll(
    accountId: number,
    page: number,
    limit: number,
    status?: number,
    projectId?: number,
  ) {
    return this.defectRepository.findAll(accountId, page, limit, status, projectId);
  }

  async findById(id: number, accountId: number) {
    const defect = await this.defectRepository.findById(id, accountId);
    if (!defect) {
      throw new NotFoundException(`Defect with ID ${id} not found`);
    }
    return defect;
  }

  async create(accountId: number, dto: CreateDefectDto) {
    return this.defectRepository.create({
      ...dto,
      accountId,
      reportedDate: new Date(dto.reportedDate),
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      fixedDate: dto.fixedDate ? new Date(dto.fixedDate) : undefined,
      verifiedDate: dto.verifiedDate ? new Date(dto.verifiedDate) : undefined,
    });
  }

  async update(id: number, accountId: number, dto: UpdateDefectDto) {
    await this.findById(id, accountId);
    const data: any = { ...dto };
    if (dto.reportedDate) data.reportedDate = new Date(dto.reportedDate);
    if (dto.dueDate) data.dueDate = new Date(dto.dueDate);
    if (dto.fixedDate) data.fixedDate = new Date(dto.fixedDate);
    if (dto.verifiedDate) data.verifiedDate = new Date(dto.verifiedDate);
    await this.defectRepository.update(id, accountId, data);
    return this.findById(id, accountId);
  }

  async delete(id: number, accountId: number) {
    await this.findById(id, accountId);
    await this.defectRepository.delete(id, accountId);
    return { message: `Defect with ID ${id} deleted successfully` };
  }

  // Defect Templates
  async findAllTemplates(accountId: number, page: number, limit: number) {
    return this.defectRepository.findAllTemplates(accountId, page, limit);
  }

  async findTemplateById(id: number, accountId: number) {
    const template = await this.defectRepository.findTemplateById(id, accountId);
    if (!template) {
      throw new NotFoundException(`Defect template with ID ${id} not found`);
    }
    return template;
  }

  async createTemplate(accountId: number, dto: CreateDefectTemplateDto) {
    return this.defectRepository.createTemplate({
      ...dto,
      accountId,
    });
  }

  async updateTemplate(id: number, accountId: number, dto: UpdateDefectTemplateDto) {
    await this.findTemplateById(id, accountId);
    await this.defectRepository.updateTemplate(id, accountId, dto);
    return this.findTemplateById(id, accountId);
  }

  async deleteTemplate(id: number, accountId: number) {
    await this.findTemplateById(id, accountId);
    await this.defectRepository.deleteTemplate(id, accountId);
    return { message: `Defect template with ID ${id} deleted successfully` };
  }
}
