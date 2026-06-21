import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class InspectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    accountId: number,
    page: number,
    limit: number,
    status?: number,
    projectId?: number,
    allowedProjectIds?: number[],
    inspectorId?: number,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { accountId };
    if (status !== undefined) where.status = status;
    if (projectId !== undefined) where.projectId = projectId;
    if (inspectorId !== undefined) where.inspectorId = inspectorId;
    if (allowedProjectIds) {
      where.projectId = allowedProjectIds.length > 0 ? { in: allowedProjectIds } : -1;
    }

    const [data, total] = await Promise.all([
      (this.prisma as any).inspection.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).inspection.count({ where }),
    ]);

    await this.enrichNames(data);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // Подставляем имена проекта и инспектора (общая БД, raw SQL — без cross-service HTTP)
  private async enrichNames(rows: any[]) {
    if (!rows?.length) return;
    const projectIds = [...new Set(rows.map((r) => r.projectId).filter(Boolean))];
    const userIds = [...new Set(rows.map((r) => r.inspectorId).filter(Boolean))];
    const [projects, users] = await Promise.all([
      projectIds.length
        ? (this.prisma as any).$queryRawUnsafe(
            `SELECT id, name FROM projects WHERE id IN (${projectIds.join(',')})`,
          )
        : [],
      userIds.length
        ? (this.prisma as any).$queryRawUnsafe(
            `SELECT id, name FROM users WHERE id IN (${userIds.join(',')})`,
          )
        : [],
    ]);
    const pMap = new Map((projects as any[]).map((p) => [Number(p.id), p.name]));
    const uMap = new Map((users as any[]).map((u) => [Number(u.id), u.name]));
    for (const r of rows) {
      r.projectName = r.projectId ? pMap.get(Number(r.projectId)) ?? null : null;
      r.inspectorName = r.inspectorId ? uMap.get(Number(r.inspectorId)) ?? null : null;
    }
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).inspection.findFirst({
      where: { id, accountId },
      include: { checklistResults: true, defects: true },
    });
  }

  // Агрегаты для аналитики технадзора
  async statsInspections(accountId: number, allowedProjectIds?: number[]) {
    const where: any = { accountId };
    if (allowedProjectIds) {
      where.projectId = allowedProjectIds.length > 0 ? { in: allowedProjectIds } : -1;
    }
    const [byStatus, total, overdue] = await Promise.all([
      (this.prisma as any).inspection.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      (this.prisma as any).inspection.count({ where }),
      (this.prisma as any).inspection.count({
        where: { ...where, status: { lt: 2 }, scheduledDate: { lt: new Date() } },
      }),
    ]);
    return { byStatus, total, overdue };
  }

  async statsDefects(accountId: number, allowedProjectIds?: number[]) {
    const where: any = { accountId };
    if (allowedProjectIds) {
      where.projectId = allowedProjectIds.length > 0 ? { in: allowedProjectIds } : -1;
    }
    const [byStatus, bySeverity, total, overdue] = await Promise.all([
      (this.prisma as any).defect.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      (this.prisma as any).defect.groupBy({
        by: ['severity'],
        where,
        _count: { _all: true },
      }),
      (this.prisma as any).defect.count({ where }),
      (this.prisma as any).defect.count({
        where: { ...where, status: { lt: 3 }, dueDate: { lt: new Date() } },
      }),
    ]);
    return { byStatus, bySeverity, total, overdue };
  }

  async create(data: any) {
    return (this.prisma as any).inspection.create({ data });
  }

  async update(id: number, accountId: number, data: any) {
    return (this.prisma as any).inspection.updateMany({
      where: { id, accountId },
      data,
    });
  }

  async delete(id: number, accountId: number) {
    return (this.prisma as any).inspection.deleteMany({
      where: { id, accountId },
    });
  }

  // Checklist Templates
  async findAllTemplates(accountId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const where = { accountId };

    const [data, total] = await Promise.all([
      (this.prisma as any).inspectionChecklistTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).inspectionChecklistTemplate.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findTemplateById(id: number, accountId: number) {
    return (this.prisma as any).inspectionChecklistTemplate.findFirst({
      where: { id, accountId },
    });
  }

  async createTemplate(data: any) {
    return (this.prisma as any).inspectionChecklistTemplate.create({ data });
  }

  async updateTemplate(id: number, accountId: number, data: any) {
    return (this.prisma as any).inspectionChecklistTemplate.updateMany({
      where: { id, accountId },
      data,
    });
  }

  async deleteTemplate(id: number, accountId: number) {
    return (this.prisma as any).inspectionChecklistTemplate.deleteMany({
      where: { id, accountId },
    });
  }

  // Checklist Results (по одной строке на инспекцию — upsert)
  async findChecklistResult(inspectionId: number) {
    return (this.prisma as any).inspectionChecklistResult.findFirst({
      where: { inspectionId },
      orderBy: { id: 'desc' },
    });
  }

  async saveChecklistResult(
    inspectionId: number,
    checklistTemplateId: number | undefined,
    results: any,
  ) {
    const existing = await this.findChecklistResult(inspectionId);
    if (existing) {
      return (this.prisma as any).inspectionChecklistResult.update({
        where: { id: existing.id },
        data: { results, checklistTemplateId: checklistTemplateId ?? existing.checklistTemplateId },
      });
    }
    return (this.prisma as any).inspectionChecklistResult.create({
      data: { inspectionId, checklistTemplateId, results },
    });
  }
}
