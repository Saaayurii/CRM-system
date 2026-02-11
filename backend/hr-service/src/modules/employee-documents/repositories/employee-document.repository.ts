import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateEmployeeDocumentDto, UpdateEmployeeDocumentDto } from '../dto';

@Injectable()
export class EmployeeDocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      (this.prisma as any).employeeDocument.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).employeeDocument.count({ where: { userId } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number, userId: number) {
    return (this.prisma as any).employeeDocument.findFirst({
      where: { id, userId },
    });
  }

  async create(userId: number, dto: CreateEmployeeDocumentDto) {
    return (this.prisma as any).employeeDocument.create({
      data: {
        userId,
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        issuingAuthority: dto.issuingAuthority,
        fileUrl: dto.fileUrl,
        notes: dto.notes,
      },
    });
  }

  async update(id: number, userId: number, dto: UpdateEmployeeDocumentDto) {
    const record = await this.findById(id, userId);
    if (!record) return null;
    return (this.prisma as any).employeeDocument.update({
      where: { id },
      data: {
        ...(dto.documentType !== undefined && {
          documentType: dto.documentType,
        }),
        ...(dto.documentNumber !== undefined && {
          documentNumber: dto.documentNumber,
        }),
        ...(dto.issueDate !== undefined && {
          issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        }),
        ...(dto.expiryDate !== undefined && {
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        }),
        ...(dto.issuingAuthority !== undefined && {
          issuingAuthority: dto.issuingAuthority,
        }),
        ...(dto.fileUrl !== undefined && { fileUrl: dto.fileUrl }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async delete(id: number, userId: number) {
    const record = await this.findById(id, userId);
    if (!record) return null;
    return (this.prisma as any).employeeDocument.delete({ where: { id } });
  }
}
