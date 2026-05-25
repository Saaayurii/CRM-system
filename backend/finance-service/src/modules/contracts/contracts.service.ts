import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateContractDto, UpdateContractDto } from './dto/upsert-contract.dto';

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  list(accountId: number, projectId?: number) {
    const where: Record<string, unknown> = { accountId };
    if (projectId) where.projectId = projectId;
    return (this.prisma as any).contract.findMany({
      where,
      orderBy: { id: 'desc' },
    });
  }

  async get(accountId: number, id: number) {
    const row = await (this.prisma as any).contract.findFirst({ where: { id, accountId } });
    if (!row) throw new NotFoundException(`Contract #${id} not found`);
    return row;
  }

  create(accountId: number, dto: CreateContractDto) {
    return (this.prisma as any).contract.create({
      data: { ...this.normalize(dto), accountId },
    });
  }

  async update(accountId: number, id: number, dto: UpdateContractDto) {
    await this.get(accountId, id);
    return (this.prisma as any).contract.update({
      where: { id },
      data: this.normalize(dto),
    });
  }

  async remove(accountId: number, id: number) {
    await this.get(accountId, id);
    await (this.prisma as any).contract.delete({ where: { id } });
    return { id };
  }

  private normalize<T extends Record<string, any>>(dto: T): Record<string, any> {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(dto)) {
      if (v === undefined) continue;
      if (k === 'signedDate' && v) {
        out[k] = new Date(v as string);
        continue;
      }
      out[k] = v === '' ? null : v;
    }
    return out;
  }
}
