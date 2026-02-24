import { Injectable, NotFoundException } from '@nestjs/common';
import { EmployeeDocumentRepository } from './repositories/employee-document.repository';
import { CreateEmployeeDocumentDto, UpdateEmployeeDocumentDto } from './dto';

@Injectable()
export class EmployeeDocumentsService {
  constructor(private readonly repository: EmployeeDocumentRepository) {}

  async findAll(accountId: number, page = 1, limit = 20) {
    return this.repository.findAll(accountId, page, limit);
  }

  async findById(id: number, accountId: number) {
    const document = await this.repository.findById(id, accountId);
    if (!document)
      throw new NotFoundException(`Employee document #${id} not found`);
    return document;
  }

  async create(userId: number, dto: CreateEmployeeDocumentDto) {
    return this.repository.create(userId, dto);
  }

  async update(id: number, accountId: number, dto: UpdateEmployeeDocumentDto) {
    const document = await this.repository.update(id, accountId, dto);
    if (!document)
      throw new NotFoundException(`Employee document #${id} not found`);
    return document;
  }

  async delete(id: number, accountId: number) {
    const document = await this.repository.delete(id, accountId);
    if (!document)
      throw new NotFoundException(`Employee document #${id} not found`);
    return document;
  }
}
