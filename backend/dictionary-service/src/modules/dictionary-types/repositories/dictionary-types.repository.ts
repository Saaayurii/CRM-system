import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateDictionaryTypeDto, UpdateDictionaryTypeDto } from '../dto';

@Injectable()
export class DictionaryTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.dictionaryType.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number) {
    return this.prisma.dictionaryType.findUnique({
      where: { id },
      include: { values: true },
    });
  }

  async findByCode(code: string) {
    return this.prisma.dictionaryType.findUnique({
      where: { code },
    });
  }

  async create(data: CreateDictionaryTypeDto) {
    return this.prisma.dictionaryType.create({ data });
  }

  async update(id: number, data: UpdateDictionaryTypeDto) {
    return this.prisma.dictionaryType.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return this.prisma.dictionaryType.delete({
      where: { id },
    });
  }
}
