// Типы параметрического прайса (1 услуга → множество позиций).

export type InfluenceType = 'coefficient' | 'surcharge' | 'none';
export type SelectionType = 'single' | 'multi';
export type CalcMethod = 'columns' | 'formula';
export type PriceStatus = 'draft' | 'active';

export interface ParamOption {
  id?: number;
  name: string;
  influenceType: InfluenceType;
  influenceValue: number;
  sortOrder?: number;
}

export interface ParamGroup {
  id?: number;
  sourceParameterId?: number | null;
  name: string;
  selectionType: SelectionType;
  isRequired: boolean;
  affectsPrice: boolean;
  sortOrder?: number;
  options: ParamOption[];
}

export interface PriceItemPrice {
  id?: number;
  projectCategoryId: number;
  price: number | string;
}

export interface PriceItem {
  id: number;
  categoryId?: number | null;
  parentId?: number | null;
  name: string;
  description?: string | null;
  unit?: string | null;
  cost?: number | string | null;
  basePrice?: number | string | null;
  status?: PriceStatus;
  calcMethod?: CalcMethod;
  rounding?: number;
  sortOrder?: number;
  prices: PriceItemPrice[];
  modifiers?: PriceItem[];
  paramGroups?: ParamGroup[];
}

export interface LibraryParameterValue {
  id?: number;
  name: string;
  influenceType: InfluenceType;
  influenceValue: number;
  sortOrder?: number;
}

export interface LibraryParameter {
  id: number;
  name: string;
  selectionType: SelectionType;
  sortOrder?: number;
  values: LibraryParameterValue[];
}

export interface PriceUnit {
  id: number;
  name: string;
  shortName?: string | null;
  sortOrder?: number;
}

export const INFLUENCE_LABELS: Record<InfluenceType, string> = {
  coefficient: 'Коэффициент',
  surcharge: 'Доплата, ₽',
  none: 'Без влияния',
};

export const ROUNDING_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Без округления' },
  { value: 1, label: 'До 1 ₽' },
  { value: 10, label: 'До 10 ₽' },
  { value: 50, label: 'До 50 ₽' },
  { value: 100, label: 'До 100 ₽' },
];
