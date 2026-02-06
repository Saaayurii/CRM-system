import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateUserDto, UpdateUserDto } from '../dto';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(accountId: number, options?: { skip?: number; take?: number }) {
    return (this.prisma as any).user.findMany({
      where: {
        accountId,
        deletedAt: null,
      },
      include: {
        role: {
          select: {
            code: true,
            name: true,
          },
        },
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number) {
    return (this.prisma as any).user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        role: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    });
  }

  async findByEmail(email: string) {
    return (this.prisma as any).user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
    });
  }

  async findByAccountAndRole(accountId: number, roleId: number) {
    return (this.prisma as any).user.findMany({
      where: {
        accountId,
        roleId,
        deletedAt: null,
      },
      include: {
        role: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    });
  }

  async create(data: CreateUserDto) {
    return (this.prisma as any).user.create({
      data: {
        accountId: data.accountId,
        name: data.name,
        email: data.email,
        roleId: data.roleId,
        phone: data.phone,
        position: data.position,
      },
      include: {
        role: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    });
  }

  async update(id: number, data: UpdateUserDto) {
    return (this.prisma as any).user.update({
      where: { id },
      data,
      include: {
        role: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    });
  }

  async softDelete(id: number) {
    return (this.prisma as any).user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  async count(accountId: number) {
    return (this.prisma as any).user.count({
      where: {
        accountId,
        deletedAt: null,
      },
    });
  }
}
