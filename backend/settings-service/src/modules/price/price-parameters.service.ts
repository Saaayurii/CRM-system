import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreatePriceParameterDto,
  UpdatePriceParameterDto,
  PriceParameterValueInput,
} from './dto/upsert-price-parameter.dto';

@Injectable()
export class PriceParametersService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly valuesInclude = {
    values: { orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }] },
  };

  list(accountId: number) {
    return (this.prisma as any).priceParameter.findMany({
      where: { accountId },
      include: this.valuesInclude,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async get(accountId: number, id: number) {
    const row = await (this.prisma as any).priceParameter.findFirst({
      where: { id, accountId },
      include: this.valuesInclude,
    });
    if (!row) throw new NotFoundException('Parameter not found');
    return row;
  }

  async create(accountId: number, dto: CreatePriceParameterDto) {
    const { values, ...rest } = dto;
    return this.prisma.$transaction(async (tx: any) => {
      const param = await tx.priceParameter.create({
        data: {
          accountId,
          name: rest.name,
          selectionType: rest.selectionType ?? 'single',
          sortOrder: rest.sortOrder ?? 0,
        },
      });
      if (values?.length) await this.replaceValuesTx(tx, param.id, values);
      return tx.priceParameter.findUnique({
        where: { id: param.id },
        include: this.valuesInclude,
      });
    });
  }

  async update(accountId: number, id: number, dto: UpdatePriceParameterDto) {
    await this.ensureOwned(accountId, id);
    const { values, ...rest } = dto;
    return this.prisma.$transaction(async (tx: any) => {
      await tx.priceParameter.update({
        where: { id },
        data: {
          ...(rest.name !== undefined ? { name: rest.name } : {}),
          ...(rest.selectionType !== undefined ? { selectionType: rest.selectionType } : {}),
          ...(rest.sortOrder !== undefined ? { sortOrder: rest.sortOrder } : {}),
        },
      });
      if (values) await this.replaceValuesTx(tx, id, values);
      return tx.priceParameter.findUnique({
        where: { id },
        include: this.valuesInclude,
      });
    });
  }

  async remove(accountId: number, id: number) {
    await this.ensureOwned(accountId, id);
    await (this.prisma as any).priceParameter.delete({ where: { id } });
    return { id };
  }

  private async replaceValuesTx(tx: any, parameterId: number, values: PriceParameterValueInput[]) {
    await tx.priceParameterValue.deleteMany({ where: { parameterId } });
    if (values.length) {
      await tx.priceParameterValue.createMany({
        data: values.map((v, i) => ({
          parameterId,
          name: v.name,
          influenceType: v.influenceType ?? 'coefficient',
          influenceValue: v.influenceValue ?? 1,
          sortOrder: v.sortOrder ?? i,
        })),
      });
    }
  }

  private async ensureOwned(accountId: number, id: number) {
    const row = await (this.prisma as any).priceParameter.findFirst({ where: { id, accountId } });
    if (!row) throw new NotFoundException(`Parameter #${id} not found`);
    return row;
  }
}
