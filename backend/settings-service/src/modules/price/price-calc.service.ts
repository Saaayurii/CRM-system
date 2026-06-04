import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CalcSelectionDto } from './dto/calc-price.dto';

export interface PriceCalcResult {
  calcMethod: string;
  basePrice: number;
  coefficient: number;
  surcharge: number;
  price: number;
  breakdown: {
    groupId: number;
    groupName: string;
    optionId: number;
    optionName: string;
    influenceType: string;
    influenceValue: number;
  }[];
}

/** Округление цены до ближайших N рублей (0 = без округления). */
export function roundPrice(value: number, rounding: number): number {
  if (!rounding || rounding <= 0) return Math.round(value * 100) / 100;
  return Math.round(value / rounding) * rounding;
}

@Injectable()
export class PriceCalcService {
  constructor(private readonly prisma: PrismaService) {}

  async calc(
    accountId: number,
    itemId: number,
    selections: CalcSelectionDto[] = [],
  ): Promise<PriceCalcResult> {
    const item = await (this.prisma as any).priceItem.findFirst({
      where: { id: itemId, accountId },
      include: {
        paramGroups: {
          include: { options: true },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
      },
    });
    if (!item) throw new NotFoundException('Price item not found');

    const basePrice = Number(item.basePrice ?? 0);
    const selByGroup = new Map<number, number[]>();
    for (const s of selections) selByGroup.set(s.groupId, s.optionIds ?? []);

    let coefficient = 1;
    let surcharge = 0;
    const breakdown: PriceCalcResult['breakdown'] = [];

    for (const group of item.paramGroups as any[]) {
      const chosen = selByGroup.get(group.id) ?? [];
      if (group.isRequired && group.selectionType === 'single' && chosen.length === 0) {
        throw new BadRequestException(`Не выбрано значение обязательного параметра «${group.name}»`);
      }
      if (group.selectionType === 'single' && chosen.length > 1) {
        throw new BadRequestException(`Параметр «${group.name}» допускает только одно значение`);
      }
      for (const optId of chosen) {
        const opt = (group.options as any[]).find((o) => o.id === optId);
        if (!opt) {
          throw new BadRequestException(`Значение #${optId} не относится к параметру «${group.name}»`);
        }
        const influenceValue = Number(opt.influenceValue ?? 0);
        if (group.affectsPrice) {
          if (opt.influenceType === 'coefficient') coefficient *= influenceValue;
          else if (opt.influenceType === 'surcharge') surcharge += influenceValue;
        }
        breakdown.push({
          groupId: group.id,
          groupName: group.name,
          optionId: opt.id,
          optionName: opt.name,
          influenceType: opt.influenceType,
          influenceValue,
        });
      }
    }

    const price = roundPrice(basePrice * coefficient + surcharge, item.rounding ?? 0);
    return {
      calcMethod: item.calcMethod,
      basePrice,
      coefficient,
      surcharge,
      price,
      breakdown,
    };
  }
}
