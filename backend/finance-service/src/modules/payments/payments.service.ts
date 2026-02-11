import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PaymentAccountsRepository } from './repositories/payment-accounts.repository';
import { PaymentsRepository } from './repositories/payments.repository';
import { CreatePaymentAccountDto } from './dto/create-payment-account.dto';
import { UpdatePaymentAccountDto } from './dto/update-payment-account.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentAccountsRepository: PaymentAccountsRepository,
    private readonly paymentsRepository: PaymentsRepository,
  ) {}

  // Payment Accounts
  async findAllPaymentAccounts(accountId: number, page: number, limit: number) {
    return this.paymentAccountsRepository.findAll(accountId, page, limit);
  }

  async findPaymentAccountById(id: number, accountId: number) {
    const paymentAccount = await this.paymentAccountsRepository.findById(
      id,
      accountId,
    );
    if (!paymentAccount) {
      throw new NotFoundException(`Payment account with ID ${id} not found`);
    }
    return paymentAccount;
  }

  async createPaymentAccount(accountId: number, dto: CreatePaymentAccountDto) {
    return this.paymentAccountsRepository.create(accountId, dto);
  }

  async updatePaymentAccount(
    id: number,
    accountId: number,
    dto: UpdatePaymentAccountDto,
  ) {
    await this.findPaymentAccountById(id, accountId);
    return this.paymentAccountsRepository.update(id, accountId, dto);
  }

  async deletePaymentAccount(id: number, accountId: number) {
    await this.findPaymentAccountById(id, accountId);
    return this.paymentAccountsRepository.delete(id, accountId);
  }

  // Payments
  async findAllPayments(accountId: number, page: number, limit: number) {
    return this.paymentsRepository.findAll(accountId, page, limit);
  }

  async findPaymentById(id: number, accountId: number) {
    const payment = await this.paymentsRepository.findById(id, accountId);
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    return payment;
  }

  async createPayment(
    accountId: number,
    dto: CreatePaymentDto,
    createdByUserId: number,
  ) {
    return this.paymentsRepository.create(accountId, dto, createdByUserId);
  }

  async updatePayment(id: number, accountId: number, dto: UpdatePaymentDto) {
    await this.findPaymentById(id, accountId);
    return this.paymentsRepository.update(id, accountId, dto);
  }

  async deletePayment(id: number, accountId: number) {
    await this.findPaymentById(id, accountId);
    return this.paymentsRepository.delete(id, accountId);
  }
}
