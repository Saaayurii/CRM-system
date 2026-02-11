import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateDashboardWidgetDto } from '../dto/create-dashboard-widget.dto';
import { UpdateDashboardWidgetDto } from '../dto/update-dashboard-widget.dto';

@Injectable()
export class DashboardWidgetRepository {
  constructor(private readonly prisma: PrismaService) {}
  async findAll(userId: number, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      (this.prisma as any).dashboardWidget.findMany({ where: { userId }, skip, take: limit, orderBy: { position: 'asc' } }),
      (this.prisma as any).dashboardWidget.count({ where: { userId } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
  async findById(id: number, userId: number) { return (this.prisma as any).dashboardWidget.findFirst({ where: { id, userId } }); }
  async create(userId: number, dto: CreateDashboardWidgetDto) { return (this.prisma as any).dashboardWidget.create({ data: { ...dto, userId } }); }
  async update(id: number, userId: number, dto: UpdateDashboardWidgetDto) { await (this.prisma as any).dashboardWidget.updateMany({ where: { id, userId }, data: { ...dto } }); return (this.prisma as any).dashboardWidget.findFirst({ where: { id, userId } }); }
  async delete(id: number, userId: number) { return (this.prisma as any).dashboardWidget.deleteMany({ where: { id, userId } }); }
}
