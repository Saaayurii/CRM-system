import { Injectable, NotFoundException } from '@nestjs/common';
import { EmployeeDocumentRepository } from './repositories/employee-document.repository';
import { CreateEmployeeDocumentDto, UpdateEmployeeDocumentDto } from './dto';

@Injectable()
export class EmployeeDocumentsService {
  constructor(private readonly repository: EmployeeDocumentRepository) {}

  async findAll(userId: number, page = 1, limit = 20) {
    return this.repository.findAll(userId, page, limit);
  }

  async findById(id: number, userId: number) {
    const document = await this.repository.findById(id, userId);
    if (!document)
      throw new NotFoundException(`Employee document #${id} not found`);
    return document;
  }

  async create(userId: number, dto: CreateEmployeeDocumentDto) {
    return this.repository.create(userId, dto);
  }

  async update(id: number, userId: number, dto: UpdateEmployeeDocumentDto) {
    const document = await this.repository.update(id, userId, dto);
    if (!document)
      throw new NotFoundException(`Employee document #${id} not found`);
    return document;
  }

  async delete(id: number, userId: number) {
    const document = await this.repository.delete(id, userId);
    if (!document)
      throw new NotFoundException(`Employee document #${id} not found`);
    return document;
  }
}
