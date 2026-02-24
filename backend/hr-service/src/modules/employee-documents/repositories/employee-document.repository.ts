import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateEmployeeDocumentDto, UpdateEmployeeDocumentDto } from '../dto';

@Injectable()
export class EmployeeDocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(accountId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const where = { user: { accountId } };
    const [rawData, total] = await Promise.all([
      (this.prisma as any).employeeDocument.findMany({
        where,
        include: { user: { select: { id: true, name: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).employeeDocument.count({ where }),
    ]);
    const data = rawData.map((doc: any) => ({
      ...doc,
      employeeName: doc.user?.name ?? '',
      user: undefined,
    }));
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number, accountId: number) {
    const doc = await (this.prisma as any).employeeDocument.findFirst({
      where: { id, user: { accountId } },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!doc) return null;
    return { ...doc, employeeName: doc.user?.name ?? '', user: undefined };
  }

  async create(currentUserId: number, dto: CreateEmployeeDocumentDto) {
    const targetUserId = dto.userId ?? currentUserId;
    return (this.prisma as any).employeeDocument.create({
      data: {
        userId: targetUserId,
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

  async update(id: number, accountId: number, dto: UpdateEmployeeDocumentDto) {
    const record = await this.findById(id, accountId);
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

  async delete(id: number, accountId: number) {
    const record = await this.findById(id, accountId);
    if (!record) return null;
    return (this.prisma as any).employeeDocument.delete({ where: { id } });
  }
}
