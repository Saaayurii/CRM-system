import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { ProxyService } from '../../common/services/proxy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class FinanceGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  // Payment Accounts
  @Get('payment-accounts')
  @ApiOperation({ summary: 'Get all payment accounts' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllPaymentAccounts(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.forward('finance', {
      method: 'GET', path: '/payment-accounts',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('payment-accounts/:id')
  @ApiOperation({ summary: 'Get payment account by ID' })
  async findOnePaymentAccount(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('finance', {
      method: 'GET', path: `/payment-accounts/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('payment-accounts')
  @ApiOperation({ summary: 'Create payment account' })
  async createPaymentAccount(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('finance', {
      method: 'POST', path: '/payment-accounts',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('payment-accounts/:id')
  @ApiOperation({ summary: 'Update payment account' })
  async updatePaymentAccount(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('finance', {
      method: 'PUT', path: `/payment-accounts/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('payment-accounts/:id')
  @ApiOperation({ summary: 'Delete payment account' })
  async removePaymentAccount(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('finance', {
      method: 'DELETE', path: `/payment-accounts/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Payments
  @Get('payments')
  @ApiOperation({ summary: 'Get all payments' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAllPayments(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number, @Query('status') status?: number) {
    return this.proxyService.forward('finance', {
      method: 'GET', path: '/payments',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit, status },
    });
  }

  @Get('payments/:id')
  @ApiOperation({ summary: 'Get payment by ID' })
  async findOnePayment(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('finance', {
      method: 'GET', path: `/payments/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('payments')
  @ApiOperation({ summary: 'Create payment' })
  async createPayment(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('finance', {
      method: 'POST', path: '/payments',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('payments/:id')
  @ApiOperation({ summary: 'Update payment' })
  async updatePayment(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('finance', {
      method: 'PUT', path: `/payments/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('payments/:id')
  @ApiOperation({ summary: 'Delete payment' })
  async removePayment(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('finance', {
      method: 'DELETE', path: `/payments/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Budgets
  @Get('budgets')
  @ApiOperation({ summary: 'Get all budgets' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllBudgets(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.forward('finance', {
      method: 'GET', path: '/budgets',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('budgets/:id')
  @ApiOperation({ summary: 'Get budget by ID' })
  async findOneBudget(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('finance', {
      method: 'GET', path: `/budgets/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('budgets')
  @ApiOperation({ summary: 'Create budget' })
  async createBudget(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('finance', {
      method: 'POST', path: '/budgets',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('budgets/:id')
  @ApiOperation({ summary: 'Update budget' })
  async updateBudget(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('finance', {
      method: 'PUT', path: `/budgets/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('budgets/:id')
  @ApiOperation({ summary: 'Delete budget' })
  async removeBudget(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('finance', {
      method: 'DELETE', path: `/budgets/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('budgets/:id/items')
  @ApiOperation({ summary: 'Add budget item' })
  async addBudgetItem(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('finance', {
      method: 'POST', path: `/budgets/${id}/items`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  // Acts
  @Get('acts')
  @ApiOperation({ summary: 'Get all acts' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllActs(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.forward('finance', {
      method: 'GET', path: '/acts',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('acts/:id')
  @ApiOperation({ summary: 'Get act by ID' })
  async findOneAct(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('finance', {
      method: 'GET', path: `/acts/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('acts')
  @ApiOperation({ summary: 'Create act' })
  async createAct(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('finance', {
      method: 'POST', path: '/acts',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('acts/:id')
  @ApiOperation({ summary: 'Update act' })
  async updateAct(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('finance', {
      method: 'PUT', path: `/acts/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('acts/:id')
  @ApiOperation({ summary: 'Delete act' })
  async removeAct(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('finance', {
      method: 'DELETE', path: `/acts/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('acts/:id/items')
  @ApiOperation({ summary: 'Add act item' })
  async addActItem(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('finance', {
      method: 'POST', path: `/acts/${id}/items`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }
}
