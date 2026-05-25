// Pure calculation logic for the 5 material calculators.
// Each calculator exposes: inputs → { results, warnings, materials, delivery }.

export type CalculatorType = 'screed' | 'warm_floor' | 'electrics' | 'plaster' | 'tile';

export interface CalcWarning {
  level: 'error' | 'warning' | 'info';
  message: string;
}

export interface CalcMaterialLine {
  name: string;
  quantity: number;
  unit: string;
  note?: string;
}

export interface CalcDelivery {
  totalWeightKg: number;
  totalVolumeM3?: number;
  recommendedTruck: string;
}

export interface CalcResult {
  summary: Array<{ label: string; value: string }>;
  materials: CalcMaterialLine[];
  warnings: CalcWarning[];
  delivery: CalcDelivery;
}

const round = (n: number, d = 2) => {
  if (!isFinite(n)) return 0;
  const k = 10 ** d;
  return Math.round(n * k) / k;
};

const ceil = (n: number) => (isFinite(n) ? Math.ceil(n) : 0);

function chooseTruck(weightKg: number, volumeM3?: number): string {
  // Simple bucketing: газель (1.5t) / зил (5t) / самосвал (10t) / 20t
  if (weightKg <= 1500 && (volumeM3 ?? 0) <= 10) return 'Газель (до 1.5 т / 10 м³)';
  if (weightKg <= 5000) return 'ЗИЛ / манипулятор (до 5 т)';
  if (weightKg <= 10000) return 'Самосвал 10 т';
  return `Тягач с прицепом (~${ceil(weightKg / 1000)} т)`;
}

// -------- 1. Screed (Стяжка пола) --------
export interface ScreedInput {
  area: number;            // м²
  thickness: number;       // см
  mixType: 'cement_sand' | 'dry' | 'leveling';
  forWarmFloor?: boolean;
}

export function calcScreed(input: ScreedInput): CalcResult {
  const warnings: CalcWarning[] = [];
  const { area, thickness, mixType, forWarmFloor } = input;

  if (!(area > 0)) warnings.push({ level: 'error', message: 'Укажите площадь больше 0.' });
  if (!(thickness > 0)) warnings.push({ level: 'error', message: 'Укажите толщину больше 0.' });

  const minThickness = forWarmFloor ? 5 : 3;
  if (thickness > 0 && thickness < minThickness) {
    warnings.push({
      level: 'error',
      message: `Минимальная толщина стяжки ${forWarmFloor ? 'под тёплый пол ' : ''}— ${minThickness} см. Уменьшение приведёт к растрескиванию.`,
    });
  }
  if (thickness > 10) {
    warnings.push({
      level: 'warning',
      message: 'При толщине более 10 см рекомендуется армирование сеткой или фиброволокном.',
    });
  }

  // Mix consumption (kg per m² per cm)
  const consumptionPerM2PerCm = mixType === 'cement_sand' ? 20 : mixType === 'dry' ? 14 : 18;
  const bagSize = 25; // кг

  const volumeM3 = (area * thickness) / 100;
  const totalMassKg = area * thickness * consumptionPerM2PerCm;
  const bags = ceil(totalMassKg / bagSize);

  // Cement+sand breakdown for cement_sand 1:3
  const cementKg = mixType === 'cement_sand' ? round(totalMassKg * 0.25) : 0;
  const sandKg = mixType === 'cement_sand' ? round(totalMassKg * 0.75) : 0;

  const materials: CalcMaterialLine[] = [];
  if (mixType === 'cement_sand') {
    materials.push({ name: 'Цемент М400/М500', quantity: cementKg, unit: 'кг' });
    materials.push({ name: 'Песок', quantity: sandKg, unit: 'кг' });
    materials.push({
      name: 'Готовая сухая смесь ЦПС (альт.)',
      quantity: bags,
      unit: `мешков по ${bagSize} кг`,
      note: 'Альтернатива замешиванию из цемента и песка',
    });
  } else if (mixType === 'dry') {
    materials.push({
      name: 'Сухая засыпка (керамзит/гранулят)',
      quantity: ceil(volumeM3 * 1000),
      unit: 'л',
    });
    materials.push({
      name: 'Гипсоволокнистые листы (ГВЛ)',
      quantity: ceil(area * 2),
      unit: 'листов',
    });
  } else {
    materials.push({ name: 'Самовыравнивающаяся смесь', quantity: bags, unit: `мешков по ${bagSize} кг` });
  }
  materials.push({ name: 'Демпферная лента', quantity: ceil(Math.sqrt(area) * 4 * 1.1), unit: 'м' });
  if (thickness > 10 || forWarmFloor) {
    materials.push({ name: 'Армирующая сетка 100×100', quantity: ceil(area * 1.05), unit: 'м²' });
  }

  const summary = [
    { label: 'Объём смеси', value: `${round(volumeM3)} м³` },
    { label: 'Масса смеси', value: `${round(totalMassKg / 1000, 2)} т` },
    { label: 'Мешков по ' + bagSize + ' кг', value: `${bags} шт` },
  ];

  return {
    summary,
    materials,
    warnings,
    delivery: {
      totalWeightKg: round(totalMassKg),
      totalVolumeM3: round(volumeM3),
      recommendedTruck: chooseTruck(totalMassKg, volumeM3),
    },
  };
}

// -------- 2. Warm floor (Тёплый пол водяной) --------
export interface WarmFloorInput {
  area: number;            // м²
  pitchCm: number;         // шаг укладки см
  screedThicknessCm: number;
  systemType: 'water' | 'electric_cable' | 'electric_mat';
}

export function calcWarmFloor(input: WarmFloorInput): CalcResult {
  const warnings: CalcWarning[] = [];
  const { area, pitchCm, screedThicknessCm, systemType } = input;

  if (!(area > 0)) warnings.push({ level: 'error', message: 'Укажите площадь больше 0.' });
  if (systemType !== 'electric_mat' && !(pitchCm > 0)) {
    warnings.push({ level: 'error', message: 'Укажите шаг укладки больше 0.' });
  }

  if (systemType === 'water' && screedThicknessCm < 5) {
    warnings.push({
      level: 'error',
      message: 'Минимальная толщина стяжки над водяным контуром — 5 см (защита от растрескивания и равномерное распределение тепла).',
    });
  }
  if (systemType === 'electric_cable' && screedThicknessCm < 3) {
    warnings.push({
      level: 'warning',
      message: 'Для греющего кабеля рекомендуется стяжка не менее 3 см.',
    });
  }
  if (pitchCm > 30) {
    warnings.push({ level: 'warning', message: 'При шаге более 30 см возможны зоны холода между контурами.' });
  }
  if (pitchCm > 0 && pitchCm < 10) {
    warnings.push({ level: 'info', message: 'Слишком плотный шаг увеличит расход трубы без значимого выигрыша.' });
  }

  const safetyMargin = 1.1;
  const pipeM = systemType === 'water' ? area / (pitchCm / 100) * safetyMargin : 0;
  const cableM = systemType === 'electric_cable' ? area / (pitchCm / 100) * safetyMargin : 0;
  const matM2 = systemType === 'electric_mat' ? area * 1.05 : 0;
  const insulationM2 = area * 1.05;
  const meshM2 = area * 1.05;
  const heatingPowerW = area * 150;

  const materials: CalcMaterialLine[] = [];
  if (systemType === 'water') {
    materials.push({ name: 'Труба PEX/PERT d16', quantity: ceil(pipeM), unit: 'м' });
    materials.push({ name: 'Коллектор (по числу контуров)', quantity: ceil(pipeM / 100), unit: 'контуров', note: '~100 м на контур' });
  } else if (systemType === 'electric_cable') {
    materials.push({ name: 'Греющий кабель', quantity: ceil(cableM), unit: 'м' });
    materials.push({ name: 'Терморегулятор + датчик', quantity: 1, unit: 'комплект' });
  } else {
    materials.push({ name: 'Нагревательный мат', quantity: round(matM2), unit: 'м²' });
    materials.push({ name: 'Терморегулятор + датчик', quantity: 1, unit: 'комплект' });
  }
  materials.push({ name: 'Теплоизоляция (EPS/XPS 30мм)', quantity: round(insulationM2), unit: 'м²' });
  materials.push({ name: 'Армирующая сетка', quantity: round(meshM2), unit: 'м²' });
  materials.push({ name: 'Демпферная лента', quantity: ceil(Math.sqrt(area) * 4 * 1.1), unit: 'м' });
  materials.push({ name: 'Крепёж для трубы/кабеля', quantity: ceil(area * 4), unit: 'шт' });

  const summary = [
    { label: 'Площадь', value: `${round(area)} м²` },
    { label: 'Мощность отопления', value: `~${ceil(heatingPowerW)} Вт` },
  ];
  if (systemType === 'water') summary.push({ label: 'Длина трубы', value: `${ceil(pipeM)} м` });
  if (systemType === 'electric_cable') summary.push({ label: 'Длина кабеля', value: `${ceil(cableM)} м` });
  if (systemType === 'electric_mat') summary.push({ label: 'Площадь мата', value: `${round(matM2)} м²` });

  const totalWeight = round(area * 5); // approx insulation+mesh+pipe weight per m²
  return {
    summary,
    materials,
    warnings,
    delivery: {
      totalWeightKg: totalWeight,
      recommendedTruck: chooseTruck(totalWeight),
    },
  };
}

// -------- 3. Electrics (Электрика) --------
export interface ElectricsInput {
  powerKw: number;        // кВт нагрузки
  voltageV: 220 | 380;
  lengthM: number;        // длина кабеля от щита до точки
  circuitType: 'lighting' | 'sockets' | 'range' | 'heavy';
  layingType?: 'open' | 'closed';
}

// Допустимый длительный ток (A) для медного кабеля, скрытая прокладка
const CABLE_AMP_TABLE: Array<{ cs: number; amp: number }> = [
  { cs: 1.5, amp: 16 },
  { cs: 2.5, amp: 25 },
  { cs: 4, amp: 32 },
  { cs: 6, amp: 40 },
  { cs: 10, amp: 50 },
  { cs: 16, amp: 75 },
  { cs: 25, amp: 100 },
];

const STD_BREAKER_RATINGS = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100];

export function calcElectrics(input: ElectricsInput): CalcResult {
  const warnings: CalcWarning[] = [];
  const { powerKw, voltageV, lengthM, circuitType } = input;

  if (!(powerKw > 0)) warnings.push({ level: 'error', message: 'Укажите мощность больше 0.' });
  if (!(lengthM > 0)) warnings.push({ level: 'error', message: 'Укажите длину кабеля больше 0.' });

  const cosPhi = circuitType === 'range' || circuitType === 'heavy' ? 0.85 : 0.95;
  const current = (powerKw * 1000) / (voltageV * cosPhi);
  const currentWithReserve = current * 1.25; // 25% запас

  const cable = CABLE_AMP_TABLE.find((c) => c.amp >= currentWithReserve);

  // По нормам: освещение — мин 1.5 мм², розетки — мин 2.5 мм²
  const minByPurpose = circuitType === 'lighting' ? 1.5 : 2.5;
  const recommendedCs = cable ? Math.max(cable.cs, minByPurpose) : 25;

  if (cable && cable.cs < minByPurpose) {
    warnings.push({
      level: 'warning',
      message: `По току достаточно ${cable.cs} мм², но для ${circuitType === 'lighting' ? 'освещения' : 'розеточной группы'} минимум ${minByPurpose} мм² по нормам.`,
    });
  }
  if (!cable) {
    warnings.push({
      level: 'error',
      message: 'Расчётный ток превышает 100 А — требуется проект и кабель спецсечения. Обратитесь к электрику.',
    });
  }

  // Падение напряжения (медь, ρ=0.0175 Ом·мм²/м)
  const rho = 0.0175;
  const voltageDrop = (2 * rho * lengthM * current) / recommendedCs; // В
  const dropPct = (voltageDrop / voltageV) * 100;
  if (dropPct > 5) {
    warnings.push({
      level: 'warning',
      message: `Расчётное падение напряжения ${round(dropPct, 1)}% (> 5%). Увеличьте сечение кабеля.`,
    });
  }

  // Выбор автомата: ближайший меньше или равный допустимому току кабеля
  const cableAmpLimit = cable ? cable.amp : 100;
  const breaker = STD_BREAKER_RATINGS.filter((b) => b <= cableAmpLimit).pop() ?? 16;

  const materials: CalcMaterialLine[] = [
    { name: `Кабель ВВГнг ${voltageV === 380 ? '5' : '3'}×${recommendedCs}`, quantity: ceil(lengthM * 1.1), unit: 'м', note: 'С запасом 10%' },
    { name: `Автоматический выключатель ${breaker}А`, quantity: 1, unit: 'шт' },
    { name: 'УЗО/Дифавтомат 30мА', quantity: circuitType === 'sockets' || circuitType === 'heavy' ? 1 : 0, unit: 'шт', note: 'Обязательно для розеток' },
    { name: 'Распределительные коробки', quantity: ceil(lengthM / 10), unit: 'шт' },
    { name: 'Гофротруба ПВХ d20', quantity: ceil(lengthM * 1.1), unit: 'м' },
  ].filter((m) => m.quantity > 0);

  const summary = [
    { label: 'Расчётный ток', value: `${round(current, 1)} А` },
    { label: 'С запасом 25%', value: `${round(currentWithReserve, 1)} А` },
    { label: 'Сечение кабеля', value: `${recommendedCs} мм²` },
    { label: 'Автомат', value: `${breaker} А` },
    { label: 'Падение напряжения', value: `${round(dropPct, 2)}%` },
  ];

  // Кабельный вес ~ 12 г/м на 1 мм² жилы
  const cores = voltageV === 380 ? 5 : 3;
  const cableWeightKg = round(lengthM * 1.1 * recommendedCs * cores * 0.012);

  return {
    summary,
    materials,
    warnings,
    delivery: {
      totalWeightKg: cableWeightKg,
      recommendedTruck: chooseTruck(cableWeightKg),
    },
  };
}

// -------- 4. Plaster (Штукатурка) --------
export interface PlasterInput {
  area: number;        // м²
  thicknessMm: number; // мм
  plasterType: 'gypsum' | 'cement';
}

export function calcPlaster(input: PlasterInput): CalcResult {
  const warnings: CalcWarning[] = [];
  const { area, thicknessMm, plasterType } = input;

  if (!(area > 0)) warnings.push({ level: 'error', message: 'Укажите площадь больше 0.' });
  if (!(thicknessMm > 0)) warnings.push({ level: 'error', message: 'Укажите толщину больше 0.' });

  if (thicknessMm > 0 && thicknessMm < 5) {
    warnings.push({ level: 'error', message: 'Минимальная толщина штукатурки — 5 мм.' });
  }
  if (plasterType === 'gypsum' && thicknessMm > 50) {
    warnings.push({ level: 'warning', message: 'Гипсовая штукатурка более 50 мм — требуется послойное нанесение и армирование.' });
  }
  if (plasterType === 'cement' && thicknessMm > 30) {
    warnings.push({ level: 'warning', message: 'ЦПС-штукатурка более 30 мм наносится в 2 слоя с армирующей сеткой.' });
  }

  // Расход кг/м² на 1 мм толщины
  const kgPerM2PerMm = plasterType === 'gypsum' ? 0.9 : 1.5;
  const totalKg = area * thicknessMm * kgPerM2PerMm;
  const bagSize = plasterType === 'gypsum' ? 30 : 25;
  const bags = ceil(totalKg / bagSize);
  const volumeM3 = (area * thicknessMm) / 1000;

  const materials: CalcMaterialLine[] = [
    { name: plasterType === 'gypsum' ? 'Штукатурка гипсовая' : 'Штукатурка цементная', quantity: bags, unit: `мешков по ${bagSize} кг` },
    { name: 'Грунтовка глубокого проникновения', quantity: ceil(area * 0.25), unit: 'л' },
    { name: 'Маяки штукатурные 6/10мм', quantity: ceil(area / 6), unit: 'шт', note: 'Шаг ~150 см' },
    { name: 'Уголки штукатурные перфорированные', quantity: ceil(Math.sqrt(area) * 2), unit: 'м' },
  ];
  if (thicknessMm > (plasterType === 'gypsum' ? 50 : 30)) {
    materials.push({ name: 'Сетка стеклотканевая 5×5', quantity: ceil(area * 1.1), unit: 'м²' });
  }

  const summary = [
    { label: 'Объём смеси', value: `${round(volumeM3, 3)} м³` },
    { label: 'Масса смеси', value: `${round(totalKg / 1000, 2)} т` },
    { label: 'Мешков', value: `${bags} шт` },
  ];

  return {
    summary,
    materials,
    warnings,
    delivery: {
      totalWeightKg: round(totalKg),
      totalVolumeM3: round(volumeM3),
      recommendedTruck: chooseTruck(totalKg, volumeM3),
    },
  };
}

// -------- 5. Tile (Плитка) --------
export interface TileInput {
  area: number;          // м²
  tileWidthCm: number;
  tileLengthCm: number;
  wastePercent: number;  // обычно 10%
  jointMm?: number;      // ширина шва, по умолчанию 2
}

export function calcTile(input: TileInput): CalcResult {
  const warnings: CalcWarning[] = [];
  const { area, tileWidthCm, tileLengthCm, wastePercent, jointMm = 2 } = input;

  if (!(area > 0)) warnings.push({ level: 'error', message: 'Укажите площадь больше 0.' });
  if (!(tileWidthCm > 0 && tileLengthCm > 0)) {
    warnings.push({ level: 'error', message: 'Укажите размеры плитки больше 0.' });
  }
  if (wastePercent < 5) {
    warnings.push({ level: 'warning', message: 'Запас менее 5% рискован — при сложной раскладке или подрезке плитки не хватит.' });
  }

  const tileAreaM2 = (tileWidthCm * tileLengthCm) / 10000;
  const tilesCount = tileAreaM2 > 0 ? ceil((area / tileAreaM2) * (1 + wastePercent / 100)) : 0;

  // Расход клея зависит от размера плитки и толщины слоя
  const tileSizeAvgCm = (tileWidthCm + tileLengthCm) / 2;
  const adhesiveKgPerM2 =
    tileSizeAvgCm <= 15 ? 3.5 : tileSizeAvgCm <= 30 ? 5 : tileSizeAvgCm <= 60 ? 6.5 : 8;
  const adhesiveBagSize = 25;
  const adhesiveKg = area * adhesiveKgPerM2;
  const adhesiveBags = ceil(adhesiveKg / adhesiveBagSize);

  // Затирка: ~0.3 кг/м² для маленькой плитки, до 0.5 для крупной
  const groutKgPerM2 = tileSizeAvgCm <= 30 ? 0.35 : 0.5;
  const groutKg = area * groutKgPerM2 * (jointMm / 2);
  const groutBagSize = 5;
  const groutBags = ceil(groutKg / groutBagSize);

  const materials: CalcMaterialLine[] = [
    { name: `Плитка ${tileWidthCm}×${tileLengthCm} см`, quantity: tilesCount, unit: 'шт', note: `С запасом ${wastePercent}%` },
    { name: 'Клей для плитки', quantity: adhesiveBags, unit: `мешков по ${adhesiveBagSize} кг` },
    { name: 'Затирка для швов', quantity: groutBags, unit: `мешков по ${groutBagSize} кг` },
    { name: 'Крестики для швов 2мм', quantity: ceil(tilesCount * 4), unit: 'шт' },
    { name: 'Грунтовка', quantity: ceil(area * 0.2), unit: 'л' },
  ];

  const summary = [
    { label: 'Плитки', value: `${tilesCount} шт (${round(tilesCount * tileAreaM2)} м²)` },
    { label: 'Клей', value: `${adhesiveBags} мешков (${round(adhesiveKg)} кг)` },
    { label: 'Затирка', value: `${groutBags} мешков (${round(groutKg)} кг)` },
  ];

  const totalWeight = adhesiveKg + groutKg + tilesCount * tileAreaM2 * 22;
  return {
    summary,
    materials,
    warnings,
    delivery: {
      totalWeightKg: round(totalWeight),
      recommendedTruck: chooseTruck(totalWeight),
    },
  };
}

// Generic dispatcher
export function runCalculation(
  type: CalculatorType,
  inputs: Record<string, unknown>,
): CalcResult {
  switch (type) {
    case 'screed':
      return calcScreed(inputs as unknown as ScreedInput);
    case 'warm_floor':
      return calcWarmFloor(inputs as unknown as WarmFloorInput);
    case 'electrics':
      return calcElectrics(inputs as unknown as ElectricsInput);
    case 'plaster':
      return calcPlaster(inputs as unknown as PlasterInput);
    case 'tile':
      return calcTile(inputs as unknown as TileInput);
  }
}

export const CALCULATOR_META: Record<CalculatorType, { label: string; icon: string; description: string }> = {
  screed: {
    label: 'Стяжка пола',
    icon: '▦',
    description: 'Расчёт смеси, цемента, песка, армирования.',
  },
  warm_floor: {
    label: 'Тёплый пол',
    icon: '♨',
    description: 'Длина трубы/кабеля, утеплитель, мощность.',
  },
  electrics: {
    label: 'Электрика',
    icon: '⚡',
    description: 'Сечение кабеля, автомат, падение напряжения.',
  },
  plaster: {
    label: 'Штукатурка',
    icon: '◫',
    description: 'Мешки штукатурки, грунт, маяки.',
  },
  tile: {
    label: 'Плитка',
    icon: '▥',
    description: 'Количество плитки, клей, затирка.',
  },
};
