import { Injectable, NotFoundException } from '@nestjs/common';
import { DictionaryValuesRepository } from './repositories/dictionary-values.repository';
import { CreateDictionaryValueDto, UpdateDictionaryValueDto } from './dto';

@Injectable()
export class DictionaryValuesService {
  constructor(private readonly repository: DictionaryValuesRepository) {}

  async findAll(filters: { dictionaryTypeId?: number; accountId?: number }) {
    return this.repository.findAll(filters);
  }

  async findById(id: number) {
    const value = await this.repository.findById(id);
    if (!value) {
      throw new NotFoundException(`Dictionary value with ID ${id} not found`);
    }
    return value;
  }

  async create(dto: CreateDictionaryValueDto, accountId: number) {
    return this.repository.create({ ...dto, accountId });
  }

  async update(id: number, dto: UpdateDictionaryValueDto) {
    await this.findById(id);
    return this.repository.update(id, dto);
  }

  async delete(id: number) {
    await this.findById(id);
    return this.repository.delete(id);
  }
}
