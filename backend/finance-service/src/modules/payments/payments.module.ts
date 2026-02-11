import { Module } from '@nestjs/common';
import {
  PaymentAccountsController,
  PaymentsController,
} from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentAccountsRepository } from './repositories/payment-accounts.repository';
import { PaymentsRepository } from './repositories/payments.repository';

@Module({
  controllers: [PaymentAccountsController, PaymentsController],
  providers: [PaymentsService, PaymentAccountsRepository, PaymentsRepository],
  exports: [PaymentsService],
})
export class PaymentsModule {}
