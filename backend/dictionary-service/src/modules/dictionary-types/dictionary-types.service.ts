import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DictionaryTypesRepository } from './repositories/dictionary-types.repository';
import { CreateDictionaryTypeDto, UpdateDictionaryTypeDto } from './dto';

@Injectable()
export class DictionaryTypesService {
  constructor(private readonly repository: DictionaryTypesRepository) {}

  async findAll() {
    return this.repository.findAll();
  }

  async findById(id: number) {
    const type = await this.repository.findById(id);
    if (!type) {
      throw new NotFoundException(`Dictionary type with ID ${id} not found`);
    }
    return type;
  }

  async create(dto: CreateDictionaryTypeDto) {
    const existing = await this.repository.findByCode(dto.code);
    if (existing) {
      throw new ConflictException(`Dictionary type with code "${dto.code}" already exists`);
    }
    return this.repository.create(dto);
  }

  async update(id: number, dto: UpdateDictionaryTypeDto) {
    await this.findById(id);
    if (dto.code) {
      const existing = await this.repository.findByCode(dto.code);
      if (existing && existing.id !== id) {
        throw new ConflictException(`Dictionary type with code "${dto.code}" already exists`);
      }
    }
    return this.repository.update(id, dto);
  }

  async delete(id: number) {
    await this.findById(id);
    return this.repository.delete(id);
  }
}
