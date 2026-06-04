import type { ParamGroup } from './types';

/** Округление до ближайших N ₽ (0 = два знака после запятой). Зеркалит backend roundPrice. */
export function roundPrice(value: number, rounding: number): number {
  if (!rounding || rounding <= 0) return Math.round(value * 100) / 100;
  return Math.round(value / rounding) * rounding;
}

export interface CalcBreakdownRow {
  groupId?: number;
  groupName: string;
  optionId?: number;
  optionName: string;
  influenceType: string;
  influenceValue: number;
}

export interface CalcResult {
  basePrice: number;
  coefficient: number;
  surcharge: number;
  price: number;
  breakdown: CalcBreakdownRow[];
  missingRequired: string[];
}

/** Selections: groupId(или индекс) → массив выбранных option id(или индексов). */
export type Selections = Map<number, number[]>;

/**
 * Чистый расчёт цены по формуле: base × Πкоэфф + Σдоплат, с округлением.
 * Идентичен backend price-calc.service для live-предпросмотра.
 * Опции/группы матчатся по полю `key` (id или индекс), переданному в selections.
 */
export function calcPrice(
  basePrice: number,
  rounding: number,
  groups: ParamGroup[],
  selections: Selections,
  groupKey: (g: ParamGroup, gi: number) => number,
  optionKey: (g: ParamGroup, gi: number, oi: number) => number,
): CalcResult {
  let coefficient = 1;
  let surcharge = 0;
  const breakdown: CalcBreakdownRow[] = [];
  const missingRequired: string[] = [];

  groups.forEach((group, gi) => {
    const gKey = groupKey(group, gi);
    const chosen = selections.get(gKey) ?? [];
    if (group.isRequired && group.selectionType === 'single' && chosen.length === 0) {
      missingRequired.push(group.name);
    }
    group.options.forEach((opt, oi) => {
      const oKey = optionKey(group, gi, oi);
      if (!chosen.includes(oKey)) return;
      const val = Number(opt.influenceValue ?? 0);
      if (group.affectsPrice) {
        if (opt.influenceType === 'coefficient') coefficient *= val;
        else if (opt.influenceType === 'surcharge') surcharge += val;
      }
      breakdown.push({
        groupId: group.id,
        groupName: group.name,
        optionId: opt.id,
        optionName: opt.name,
        influenceType: opt.influenceType,
        influenceValue: val,
      });
    });
  });

  const price = roundPrice(basePrice * coefficient + surcharge, rounding);
  return { basePrice, coefficient, surcharge, price, breakdown, missingRequired };
}
