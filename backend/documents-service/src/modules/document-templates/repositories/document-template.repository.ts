import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateDocumentTemplateDto } from '../dto/create-document-template.dto';
import { UpdateDocumentTemplateDto } from '../dto/update-document-template.dto';

@Injectable()
export class DocumentTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(accountId: number, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: any = { accountId };

    const [data, total] = await Promise.all([
      (this.prisma as any).documentTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).documentTemplate.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).documentTemplate.findFirst({
      where: { id, accountId },
    });
  }

  async create(accountId: number, dto: CreateDocumentTemplateDto) {
    const data: any = { ...dto, accountId };
    return (this.prisma as any).documentTemplate.create({ data });
  }

  async update(id: number, accountId: number, dto: UpdateDocumentTemplateDto) {
    const data: any = { ...dto };
    return (this.prisma as any).documentTemplate
      .updateMany({
        where: { id, accountId },
        data,
      })
      .then(async () => {
        return (this.prisma as any).documentTemplate.findFirst({
          where: { id, accountId },
        });
      });
  }

  async delete(id: number, accountId: number) {
    return (this.prisma as any).documentTemplate.deleteMany({
      where: { id, accountId },
    });
  }
}
