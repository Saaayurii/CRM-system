import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentRepository } from './repositories/document.repository';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class DocumentsService {
  constructor(private readonly documentRepository: DocumentRepository) {}

  async findAll(
    accountId: number,
    page: number,
    limit: number,
    filters?: { projectId?: number; documentType?: string; status?: string },
  ) {
    return this.documentRepository.findAll(accountId, page, limit, filters);
  }

  async findById(id: number, accountId: number) {
    const document = await this.documentRepository.findById(id, accountId);
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    return document;
  }

  async create(accountId: number, dto: CreateDocumentDto) {
    return this.documentRepository.create(accountId, dto);
  }

  async update(id: number, accountId: number, dto: UpdateDocumentDto) {
    await this.findById(id, accountId);
    return this.documentRepository.update(id, accountId, dto);
  }

  async delete(id: number, accountId: number) {
    await this.findById(id, accountId);
    return this.documentRepository.delete(id, accountId);
  }
}
