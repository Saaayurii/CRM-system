import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PaymentsService } from '../payments.service';
import { PaymentsRepository } from '../repositories/payments.repository';
import { PaymentAccountsRepository } from '../repositories/payment-accounts.repository';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentsRepository: jest.Mocked<PaymentsRepository>;
  let paymentAccountsRepository: jest.Mocked<PaymentAccountsRepository>;

  const mockPaymentAccount = {
    id: 1,
    accountId: 1,
    name: 'Main Account',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPayment = {
    id: 1,
    accountId: 1,
    amount: 1000,
    createdByUserId: 1,
    paymentAccountId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedAccounts = {
    data: [mockPaymentAccount],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  const mockPaginatedPayments = {
    data: [mockPayment],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PaymentAccountsRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: PaymentsRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    paymentsRepository = module.get(PaymentsRepository);
    paymentAccountsRepository = module.get(PaymentAccountsRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── Payment Accounts ──────────────────────────────────────────────

  describe('findAllPaymentAccounts', () => {
    it('should return paginated payment accounts', async () => {
      paymentAccountsRepository.findAll.mockResolvedValue(
        mockPaginatedAccounts,
      );
      const result = await service.findAllPaymentAccounts(1, 1, 20);
      expect(result).toEqual(mockPaginatedAccounts);
      expect(paymentAccountsRepository.findAll).toHaveBeenCalledWith(1, 1, 20);
    });
  });

  describe('findPaymentAccountById', () => {
    it('should return a payment account when found', async () => {
      paymentAccountsRepository.findById.mockResolvedValue(mockPaymentAccount);
      const result = await service.findPaymentAccountById(1, 1);
      expect(result).toEqual(mockPaymentAccount);
    });

    it('should throw NotFoundException when payment account not found', async () => {
      paymentAccountsRepository.findById.mockResolvedValue(null);
      await expect(service.findPaymentAccountById(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createPaymentAccount', () => {
    it('should create and return a payment account', async () => {
      const dto = { name: 'Main Account' } as any;
      paymentAccountsRepository.create.mockResolvedValue(mockPaymentAccount);
      const result = await service.createPaymentAccount(1, dto);
      expect(result).toEqual(mockPaymentAccount);
      expect(paymentAccountsRepository.create).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('deletePaymentAccount', () => {
    it('should delete a payment account', async () => {
      paymentAccountsRepository.findById.mockResolvedValue(mockPaymentAccount);
      paymentAccountsRepository.delete.mockResolvedValue({ count: 1 } as any);
      await service.deletePaymentAccount(1, 1);
      expect(paymentAccountsRepository.delete).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when deleting non-existent payment account', async () => {
      paymentAccountsRepository.findById.mockResolvedValue(null);
      await expect(service.deletePaymentAccount(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── Payments ──────────────────────────────────────────────────────

  describe('findAllPayments', () => {
    it('should return paginated payments', async () => {
      paymentsRepository.findAll.mockResolvedValue(mockPaginatedPayments);
      const result = await service.findAllPayments(1, 1, 20);
      expect(result).toEqual(mockPaginatedPayments);
    });
  });

  describe('findPaymentById', () => {
    it('should return a payment when found', async () => {
      paymentsRepository.findById.mockResolvedValue(mockPayment);
      const result = await service.findPaymentById(1, 1);
      expect(result).toEqual(mockPayment);
    });

    it('should throw NotFoundException when payment not found', async () => {
      paymentsRepository.findById.mockResolvedValue(null);
      await expect(service.findPaymentById(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createPayment', () => {
    it('should create and return a payment', async () => {
      const dto = { amount: 1000, paymentAccountId: 1 } as any;
      paymentsRepository.create.mockResolvedValue(mockPayment);
      const result = await service.createPayment(1, dto, 1);
      expect(result).toEqual(mockPayment);
      expect(paymentsRepository.create).toHaveBeenCalledWith(1, dto, 1);
    });
  });

  describe('deletePayment', () => {
    it('should delete a payment', async () => {
      paymentsRepository.findById.mockResolvedValue(mockPayment);
      paymentsRepository.delete.mockResolvedValue({ count: 1 } as any);
      await service.deletePayment(1, 1);
      expect(paymentsRepository.delete).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when deleting non-existent payment', async () => {
      paymentsRepository.findById.mockResolvedValue(null);
      await expect(service.deletePayment(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
