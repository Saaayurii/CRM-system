import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateDocumentDto } from '../dto/create-document.dto';
import { UpdateDocumentDto } from '../dto/update-document.dto';

@Injectable()
export class DocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    accountId: number,
    page: number = 1,
    limit: number = 20,
    filters?: { projectId?: number; documentType?: string; status?: string },
  ) {
    const skip = (page - 1) * limit;
    const where: any = { accountId, deletedAt: null };

    if (filters?.projectId) {
      where.projectId = filters.projectId;
    }
    if (filters?.documentType) {
      where.documentType = filters.documentType;
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    const [data, total] = await Promise.all([
      (this.prisma as any).document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).document.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).document.findFirst({
      where: { id, accountId, deletedAt: null },
    });
  }

  async create(accountId: number, dto: CreateDocumentDto) {
    const data: any = { ...dto, accountId };
    if (dto.issueDate) {
      data.issueDate = new Date(dto.issueDate);
    }
    if (dto.expiryDate) {
      data.expiryDate = new Date(dto.expiryDate);
    }
    return (this.prisma as any).document.create({ data });
  }

  async update(id: number, accountId: number, dto: UpdateDocumentDto) {
    const data: any = { ...dto };
    if (dto.issueDate) {
      data.issueDate = new Date(dto.issueDate);
    }
    if (dto.expiryDate) {
      data.expiryDate = new Date(dto.expiryDate);
    }
    return (this.prisma as any).document
      .updateMany({
        where: { id, accountId },
        data,
      })
      .then(async () => {
        return (this.prisma as any).document.findFirst({
          where: { id, accountId },
        });
      });
  }

  async delete(id: number, accountId: number) {
    return (this.prisma as any).document.deleteMany({
      where: { id, accountId },
    });
  }
}
