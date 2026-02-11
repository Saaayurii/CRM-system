import { Test, TestingModule } from '@nestjs/testing';
import {
  PaymentAccountsController,
  PaymentsController,
} from '../payments.controller';
import { PaymentsService } from '../payments.service';

describe('PaymentsController', () => {
  let paymentsController: PaymentsController;
  let paymentAccountsController: PaymentAccountsController;
  let service: jest.Mocked<PaymentsService>;

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
      controllers: [PaymentAccountsController, PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: {
            findAllPaymentAccounts: jest.fn(),
            findPaymentAccountById: jest.fn(),
            createPaymentAccount: jest.fn(),
            updatePaymentAccount: jest.fn(),
            deletePaymentAccount: jest.fn(),
            findAllPayments: jest.fn(),
            findPaymentById: jest.fn(),
            createPayment: jest.fn(),
            updatePayment: jest.fn(),
            deletePayment: jest.fn(),
          },
        },
      ],
    }).compile();

    paymentsController = module.get<PaymentsController>(PaymentsController);
    paymentAccountsController = module.get<PaymentAccountsController>(
      PaymentAccountsController,
    );
    service = module.get(PaymentsService);
  });

  it('should be defined', () => {
    expect(paymentsController).toBeDefined();
    expect(paymentAccountsController).toBeDefined();
  });

  // ─── Payment Accounts Controller ──────────────────────────────────

  describe('PaymentAccountsController.findAll', () => {
    it('should delegate to service.findAllPaymentAccounts', async () => {
      service.findAllPaymentAccounts.mockResolvedValue(mockPaginatedAccounts);
      const result = await paymentAccountsController.findAll(1, 1, 20);
      expect(result).toEqual(mockPaginatedAccounts);
      expect(service.findAllPaymentAccounts).toHaveBeenCalledWith(1, 1, 20);
    });
  });

  describe('PaymentAccountsController.findOne', () => {
    it('should delegate to service.findPaymentAccountById', async () => {
      service.findPaymentAccountById.mockResolvedValue(mockPaymentAccount);
      const result = await paymentAccountsController.findOne(1, 1);
      expect(result).toEqual(mockPaymentAccount);
    });
  });

  describe('PaymentAccountsController.create', () => {
    it('should delegate to service.createPaymentAccount', async () => {
      const dto = { name: 'Main Account' } as any;
      service.createPaymentAccount.mockResolvedValue(mockPaymentAccount);
      const result = await paymentAccountsController.create(dto, 1);
      expect(result).toEqual(mockPaymentAccount);
      expect(service.createPaymentAccount).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('PaymentAccountsController.remove', () => {
    it('should delegate to service.deletePaymentAccount', async () => {
      service.deletePaymentAccount.mockResolvedValue({ count: 1 } as any);
      await paymentAccountsController.remove(1, 1);
      expect(service.deletePaymentAccount).toHaveBeenCalledWith(1, 1);
    });
  });

  // ─── Payments Controller ──────────────────────────────────────────

  describe('PaymentsController.findAll', () => {
    it('should delegate to service.findAllPayments', async () => {
      service.findAllPayments.mockResolvedValue(mockPaginatedPayments);
      const result = await paymentsController.findAll(1, 1, 20);
      expect(result).toEqual(mockPaginatedPayments);
    });
  });

  describe('PaymentsController.findOne', () => {
    it('should delegate to service.findPaymentById', async () => {
      service.findPaymentById.mockResolvedValue(mockPayment);
      const result = await paymentsController.findOne(1, 1);
      expect(result).toEqual(mockPayment);
    });
  });

  describe('PaymentsController.create', () => {
    it('should delegate to service.createPayment', async () => {
      const dto = { amount: 1000, paymentAccountId: 1 } as any;
      service.createPayment.mockResolvedValue(mockPayment);
      const result = await paymentsController.create(dto, 1, 1);
      expect(result).toEqual(mockPayment);
      expect(service.createPayment).toHaveBeenCalledWith(1, dto, 1);
    });
  });
});
