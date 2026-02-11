import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateDictionaryValueDto, UpdateDictionaryValueDto } from '../dto';

@Injectable()
export class DictionaryValuesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: { dictionaryTypeId?: number; accountId?: number }) {
    const where: any = {};
    if (filters.dictionaryTypeId) where.dictionaryTypeId = filters.dictionaryTypeId;
    if (filters.accountId) where.accountId = filters.accountId;

    return this.prisma.dictionaryValue.findMany({
      where,
      include: { dictionaryType: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findById(id: number) {
    return this.prisma.dictionaryValue.findUnique({
      where: { id },
      include: { dictionaryType: true },
    });
  }

  async create(data: CreateDictionaryValueDto & { accountId: number }) {
    return this.prisma.dictionaryValue.create({
      data,
      include: { dictionaryType: true },
    });
  }

  async update(id: number, data: UpdateDictionaryValueDto) {
    return this.prisma.dictionaryValue.update({
      where: { id },
      data,
      include: { dictionaryType: true },
    });
  }

  async delete(id: number) {
    return this.prisma.dictionaryValue.delete({
      where: { id },
    });
  }
}
