import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class BuildingObjectRepository {
  private get model() { return (this.prisma as any).buildingObject; }
  constructor(private readonly prisma: PrismaService) {}

  async findAll(accountId: number, opts: { projectId?: number; constructionSiteId?: number; parentId?: number | null; objectType?: string; status?: string; page?: number; limit?: number }) {
    const { projectId, constructionSiteId, parentId, objectType, status, page = 1, limit = 100 } = opts;
    const where: any = { accountId };
    if (projectId !== undefined) where.projectId = projectId;
    if (constructionSiteId !== undefined) where.constructionSiteId = constructionSiteId;
    if (parentId !== undefined) where.parentId = parentId;
    if (objectType) where.objectType = objectType;
    if (status) where.status = status;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.model.findMany({ where, skip, take: limit, orderBy: { createdAt: 'asc' }, include: { children: { select: { id: true, name: true, objectType: true, status: true } }, facilities: { select: { id: true, name: true, facilityType: true, status: true } } } }),
      this.model.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findById(id: number, accountId: number) {
    return this.model.findFirst({
      where: { id, accountId },
      include: {
        parent: { select: { id: true, name: true, objectType: true } },
        children: { select: { id: true, name: true, objectType: true, classification: true, status: true, parameters: true } },
        facilities: { select: { id: true, name: true, facilityType: true, status: true, location: true } },
      },
    });
  }

  async create(accountId: number, data: any, createdBy: number) {
    return this.model.create({ data: { ...data, accountId, createdBy } });
  }

  async update(id: number, accountId: number, data: any) {
    return this.model.updateMany({ where: { id, accountId }, data });
  }

  async delete(id: number, accountId: number) {
    return this.model.deleteMany({ where: { id, accountId } });
  }
}
