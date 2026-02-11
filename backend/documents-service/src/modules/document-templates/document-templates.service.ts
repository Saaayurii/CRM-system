import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentTemplateRepository } from './repositories/document-template.repository';
import { CreateDocumentTemplateDto } from './dto/create-document-template.dto';
import { UpdateDocumentTemplateDto } from './dto/update-document-template.dto';

@Injectable()
export class DocumentTemplatesService {
  constructor(private readonly documentTemplateRepository: DocumentTemplateRepository) {}

  async findAll(accountId: number, page: number, limit: number) {
    return this.documentTemplateRepository.findAll(accountId, page, limit);
  }

  async findById(id: number, accountId: number) {
    const template = await this.documentTemplateRepository.findById(id, accountId);
    if (!template) {
      throw new NotFoundException(`Document template with ID ${id} not found`);
    }
    return template;
  }

  async create(accountId: number, dto: CreateDocumentTemplateDto) {
    return this.documentTemplateRepository.create(accountId, dto);
  }

  async update(id: number, accountId: number, dto: UpdateDocumentTemplateDto) {
    await this.findById(id, accountId);
    return this.documentTemplateRepository.update(id, accountId, dto);
  }

  async delete(id: number, accountId: number) {
    await this.findById(id, accountId);
    return this.documentTemplateRepository.delete(id, accountId);
  }
}
