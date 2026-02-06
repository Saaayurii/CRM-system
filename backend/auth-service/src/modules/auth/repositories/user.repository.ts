import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number) {
    return (this.prisma as any).user.findFirst({
      where: {
        id,
        deletedAt: null,
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

  async findByIdWithRole(id: number) {
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

  async create(data: any) {
    return (this.prisma as any).user.create({
      data,
    });
  }

  async updateRefreshToken(
    userId: number,
    refreshToken: string | null,
    expiresAt: Date | null,
  ) {
    return (this.prisma as any).user.update({
      where: { id: userId },
      data: {
        refreshToken,
        refreshTokenExpiresAt: expiresAt,
      },
    });
  }

  async updateSignInInfo(userId: number) {
    return (this.prisma as any).user.update({
      where: { id: userId },
      data: {
        lastSignInAt: new Date(),
        currentSignInAt: new Date(),
        signInCount: {
          increment: 1,
        },
      },
    });
  }

  async clearAllRefreshTokens(userId: number) {
    return (this.prisma as any).user.update({
      where: { id: userId },
      data: {
        refreshToken: null,
        refreshTokenExpiresAt: null,
      },
    });
  }
}
