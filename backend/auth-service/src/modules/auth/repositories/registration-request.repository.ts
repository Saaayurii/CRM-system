import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class RegistrationRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    return (this.prisma as any).registrationRequest.create({ data });
  }

  async findById(id: number) {
    return (this.prisma as any).registrationRequest.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string) {
    return (this.prisma as any).registrationRequest.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPendingByEmail(email: string) {
    return (this.prisma as any).registrationRequest.findFirst({
      where: { email, status: 0 },
    });
  }

  async findAll(status?: number) {
    const where = status !== undefined ? { status } : {};
    return (this.prisma as any).registrationRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(
    id: number,
    data: {
      status: number;
      rejectReason?: string;
      reviewedBy: number;
      reviewedAt: Date;
    },
  ) {
    return (this.prisma as any).registrationRequest.update({
      where: { id },
      data,
    });
  }
}
