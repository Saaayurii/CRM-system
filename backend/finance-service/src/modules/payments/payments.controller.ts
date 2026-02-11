import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentAccountDto } from './dto/create-payment-account.dto';
import { UpdatePaymentAccountDto } from './dto/update-payment-account.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Payment Accounts')
@ApiBearerAuth()
@Controller('payment-accounts')
export class PaymentAccountsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all payment accounts' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser('accountId') accountId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.paymentsService.findAllPaymentAccounts(accountId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment account by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.paymentsService.findPaymentAccountById(id, accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create payment account' })
  create(
    @Body() dto: CreatePaymentAccountDto,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.paymentsService.createPaymentAccount(accountId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update payment account' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaymentAccountDto,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.paymentsService.updatePaymentAccount(id, accountId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete payment account' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.paymentsService.deletePaymentAccount(id, accountId);
  }
}

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all payments' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser('accountId') accountId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.paymentsService.findAllPayments(accountId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.paymentsService.findPaymentById(id, accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create payment' })
  create(
    @Body() dto: CreatePaymentDto,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.paymentsService.createPayment(accountId, dto, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update payment' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaymentDto,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.paymentsService.updatePayment(id, accountId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete payment' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.paymentsService.deletePayment(id, accountId);
  }
}
