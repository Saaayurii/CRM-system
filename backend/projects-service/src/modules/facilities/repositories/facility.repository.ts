import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class FacilityRepository {
  private get fac() { return (this.prisma as any).uniqueFacility; }
  private get comp() { return (this.prisma as any).facilityComponent; }
  constructor(private readonly prisma: PrismaService) {}

  async findByObject(objectId: number) {
    return this.fac.findMany({ where: { objectId }, orderBy: { createdAt: 'asc' }, include: { components: { orderBy: { position: 'asc' } } } });
  }

  async findById(id: number) {
    return this.fac.findFirst({ where: { id }, include: { components: { orderBy: { position: 'asc' } }, object: { select: { id: true, name: true, accountId: true } } } });
  }

  async create(data: any, createdBy: number) {
    return this.fac.create({ data: { ...data, createdBy }, include: { components: true } });
  }

  async update(id: number, data: any) {
    return this.fac.update({ where: { id }, data });
  }

  async delete(id: number) {
    return this.fac.delete({ where: { id } });
  }

  async createComponent(facilityId: number, data: any) {
    return this.comp.create({ data: { ...data, facilityId } });
  }

  async updateComponent(componentId: number, data: any) {
    return this.comp.update({ where: { id: componentId }, data });
  }

  async deleteComponent(componentId: number) {
    return this.comp.delete({ where: { id: componentId } });
  }
}
