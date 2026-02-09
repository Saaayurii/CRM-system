import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateContractorDto, UpdateContractorDto, CreateContractorAssignmentDto } from '../dto';

@Injectable()
export class ContractorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(accountId: number, options?: { skip?: number; take?: number }) {
    const where: any = {
      accountId,
      deletedAt: null,
    };

    return (this.prisma as any).contractor.findMany({
      where,
      skip: options?.skip,
      take: options?.take,
      include: {
        assignments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number) {
    return (this.prisma as any).contractor.findFirst({
      where: { id, deletedAt: null },
      include: {
        assignments: true,
      },
    });
  }

  async create(data: CreateContractorDto) {
    return (this.prisma as any).contractor.create({
      data: {
        accountId: data.accountId,
        name: data.name,
        legalName: data.legalName,
        inn: data.inn,
        kpp: data.kpp,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email,
        legalAddress: data.legalAddress,
        specialization: data.specialization ?? [],
        rating: data.rating,
        reliabilityScore: data.reliabilityScore,
        paymentTerms: data.paymentTerms,
        status: data.status ?? 1,
        isVerified: data.isVerified ?? false,
        notes: data.notes,
        documents: data.documents ?? [],
      },
      include: {
        assignments: true,
      },
    });
  }

  async update(id: number, data: UpdateContractorDto) {
    const updateData: any = { ...data };
    return (this.prisma as any).contractor.update({
      where: { id },
      data: updateData,
      include: {
        assignments: true,
      },
    });
  }

  async softDelete(id: number) {
    return (this.prisma as any).contractor.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async count(accountId: number) {
    return (this.prisma as any).contractor.count({
      where: { accountId, deletedAt: null },
    });
  }

  // Contractor Assignments
  async findAssignments(contractorId: number) {
    return (this.prisma as any).contractorAssignment.findMany({
      where: { contractorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAssignment(contractorId: number, data: CreateContractorAssignmentDto) {
    return (this.prisma as any).contractorAssignment.create({
      data: {
        contractorId,
        projectId: data.projectId,
        constructionSiteId: data.constructionSiteId,
        workType: data.workType,
        contractAmount: data.contractAmount,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        status: data.status ?? 0,
      },
    });
  }
}
