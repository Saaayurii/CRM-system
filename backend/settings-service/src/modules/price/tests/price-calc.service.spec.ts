import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PriceCalcService, roundPrice } from '../price-calc.service';

describe('roundPrice', () => {
  it('rounds to nearest N rubles', () => {
    expect(roundPrice(2417, 10)).toBe(2420);
    expect(roundPrice(2412, 10)).toBe(2410);
  });
  it('keeps 2 decimals when rounding disabled', () => {
    expect(roundPrice(2417.5, 0)).toBe(2417.5);
    expect(roundPrice(2417.124, 0)).toBe(2417.12);
  });
});

describe('PriceCalcService', () => {
  const concreteItem = {
    id: 1,
    accountId: 1,
    basePrice: '1000',
    rounding: 10,
    calcMethod: 'formula',
    paramGroups: [
      {
        id: 10,
        name: 'Материал',
        selectionType: 'single',
        isRequired: true,
        affectsPrice: true,
        sortOrder: 0,
        options: [
          { id: 100, name: 'Бетон', influenceType: 'coefficient', influenceValue: '1.6' },
        ],
      },
      {
        id: 11,
        name: 'Глубина',
        selectionType: 'single',
        isRequired: true,
        affectsPrice: true,
        sortOrder: 1,
        options: [
          { id: 110, name: '300–600', influenceType: 'coefficient', influenceValue: '1.2' },
        ],
      },
      {
        id: 12,
        name: 'Усложнители',
        selectionType: 'multi',
        isRequired: false,
        affectsPrice: true,
        sortOrder: 2,
        options: [
          { id: 120, name: 'Ночной режим', influenceType: 'surcharge', influenceValue: '500' },
        ],
      },
    ],
  };

  function makeService(item: any) {
    const prisma = {
      priceItem: { findFirst: jest.fn().mockResolvedValue(item) },
    };
    return new PriceCalcService(prisma as any);
  }

  it('computes base × coefficients + surcharges with rounding', async () => {
    const svc = makeService(concreteItem);
    const res = await svc.calc(1, 1, [
      { groupId: 10, optionIds: [100] },
      { groupId: 11, optionIds: [110] },
      { groupId: 12, optionIds: [120] },
    ]);
    // 1000 * 1.6 * 1.2 + 500 = 2420
    expect(res.coefficient).toBeCloseTo(1.92);
    expect(res.surcharge).toBe(500);
    expect(res.price).toBe(2420);
    expect(res.breakdown).toHaveLength(3);
  });

  it('throws when a required single parameter is missing', async () => {
    const svc = makeService(concreteItem);
    await expect(
      svc.calc(1, 1, [{ groupId: 10, optionIds: [100] }]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when item not found', async () => {
    const svc = makeService(null);
    await expect(svc.calc(1, 99, [])).rejects.toBeInstanceOf(NotFoundException);
  });
});
