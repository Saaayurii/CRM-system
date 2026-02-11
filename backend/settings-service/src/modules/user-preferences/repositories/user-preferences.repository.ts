import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class UserPreferencesRepository {
  constructor(private readonly prisma: PrismaService) {}
  async findByUserId(userId: number) {
    return (this.prisma as any).user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        settings: true,
        notificationSettings: true,
      },
    });
  }
  async update(userId: number, data: any) {
    return (this.prisma as any).user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        settings: true,
        notificationSettings: true,
      },
    });
  }
}
