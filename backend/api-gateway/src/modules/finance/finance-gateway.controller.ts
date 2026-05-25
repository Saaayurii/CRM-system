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
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { HttpService } from '@nestjs/axios';
import { ProxyService } from '../../common/services/proxy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequestContextService } from '../../common/services/request-context.service';

@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class FinanceGatewayController {
  constructor(
    private readonly proxyService: ProxyService,
    private readonly httpService: HttpService,
    private readonly requestContext: RequestContextService,
  ) {}

  // Payment Accounts
  @Get('payment-accounts')
  @ApiOperation({ summary: 'Get all payment accounts' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllPaymentAccounts(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('finance', {
      method: 'GET',
      path: '/payment-accounts',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('payment-accounts/:id')
  @ApiOperation({ summary: 'Get payment account by ID' })
  async findOnePaymentAccount(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('finance', {
      method: 'GET',
      path: `/payment-accounts/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('payment-accounts')
  @ApiOperation({ summary: 'Create payment account' })
  async createPaymentAccount(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('finance', {
      method: 'POST',
      path: '/payment-accounts',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('payment-accounts/:id')
  @ApiOperation({ summary: 'Update payment account' })
  async updatePaymentAccount(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('finance', {
      method: 'PUT',
      path: `/payment-accounts/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('payment-accounts/:id')
  @ApiOperation({ summary: 'Delete payment account' })
  async removePaymentAccount(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('finance', {
      method: 'DELETE',
      path: `/payment-accounts/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Payments
  @Get('payments')
  @ApiOperation({ summary: 'Get all payments' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'constructionSiteId', required: false })
  @ApiQuery({ name: 'direction', required: false, enum: ['income', 'expense'] })
  @ApiQuery({ name: 'subType', required: false })
  @ApiQuery({ name: 'paymentAccountId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  async findAllPayments(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: number,
    @Query('projectId') projectId?: number,
    @Query('constructionSiteId') constructionSiteId?: number,
    @Query('direction') direction?: 'income' | 'expense',
    @Query('subType') subType?: string,
    @Query('paymentAccountId') paymentAccountId?: number,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.proxyService.forward('finance', {
      method: 'GET',
      path: '/payments',
      headers: { authorization: req.headers.authorization || '' },
      params: {
        page,
        limit,
        status,
        projectId,
        constructionSiteId,
        direction,
        subType,
        paymentAccountId,
        dateFrom,
        dateTo,
      },
    });
  }

  @Get('payments/stats')
  @ApiOperation({ summary: 'Aggregated finance stats' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'constructionSiteId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  async getPaymentStats(
    @Req() req: Request,
    @Query('projectId') projectId?: number,
    @Query('constructionSiteId') constructionSiteId?: number,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.proxyService.forward('finance', {
      method: 'GET',
      path: '/payments/stats',
      headers: { authorization: req.headers.authorization || '' },
      params: { projectId, constructionSiteId, dateFrom, dateTo },
    });
  }

  @Get('payments/:id')
  @ApiOperation({ summary: 'Get payment by ID' })
  async findOnePayment(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('finance', {
      method: 'GET',
      path: `/payments/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('payments')
  @ApiOperation({ summary: 'Create payment' })
  async createPayment(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('finance', {
      method: 'POST',
      path: '/payments',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('payments/:id')
  @ApiOperation({ summary: 'Update payment' })
  async updatePayment(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('finance', {
      method: 'PUT',
      path: `/payments/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('payments/:id')
  @ApiOperation({ summary: 'Delete payment' })
  async removePayment(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('finance', {
      method: 'DELETE',
      path: `/payments/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Budgets
  @Get('budgets')
  @ApiOperation({ summary: 'Get all budgets' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  async findAllBudgets(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('projectId') projectId?: number,
  ) {
    return this.proxyService.forward('finance', {
      method: 'GET',
      path: '/budgets',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit, projectId },
    });
  }

  @Get('budgets/:id')
  @ApiOperation({ summary: 'Get budget by ID' })
  async findOneBudget(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('finance', {
      method: 'GET',
      path: `/budgets/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('budgets')
  @ApiOperation({ summary: 'Create budget' })
  async createBudget(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('finance', {
      method: 'POST',
      path: '/budgets',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('budgets/:id')
  @ApiOperation({ summary: 'Update budget' })
  async updateBudget(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('finance', {
      method: 'PUT',
      path: `/budgets/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('budgets/:id')
  @ApiOperation({ summary: 'Delete budget' })
  async removeBudget(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('finance', {
      method: 'DELETE',
      path: `/budgets/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('budgets/:id/items')
  @ApiOperation({ summary: 'Add budget item' })
  async addBudgetItem(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('finance', {
      method: 'POST',
      path: `/budgets/${id}/items`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  // Acts
  @Get('acts')
  @ApiOperation({ summary: 'Get all acts' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  async findAllActs(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('projectId') projectId?: number,
  ) {
    return this.proxyService.forward('finance', {
      method: 'GET',
      path: '/acts',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit, projectId },
    });
  }

  @Get('acts/:id')
  @ApiOperation({ summary: 'Get act by ID' })
  async findOneAct(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('finance', {
      method: 'GET',
      path: `/acts/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('acts')
  @ApiOperation({ summary: 'Create act' })
  async createAct(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('finance', {
      method: 'POST',
      path: '/acts',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('acts/:id')
  @ApiOperation({ summary: 'Update act' })
  async updateAct(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('finance', {
      method: 'PUT',
      path: `/acts/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('acts/:id')
  @ApiOperation({ summary: 'Delete act' })
  async removeAct(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('finance', {
      method: 'DELETE',
      path: `/acts/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('acts/:id/items')
  @ApiOperation({ summary: 'Add act item' })
  async addActItem(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('finance', {
      method: 'POST',
      path: `/acts/${id}/items`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  // Bonuses
  @Get('bonuses')
  @ApiOperation({ summary: 'Get all bonuses' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllBonuses(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('finance', {
      method: 'GET',
      path: '/bonuses',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('bonuses/:id')
  @ApiOperation({ summary: 'Get bonus by ID' })
  async findOneBonus(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('finance', {
      method: 'GET',
      path: `/bonuses/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('bonuses')
  @ApiOperation({ summary: 'Create bonus' })
  async createBonus(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('finance', {
      method: 'POST',
      path: '/bonuses',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('bonuses/:id')
  @ApiOperation({ summary: 'Update bonus' })
  async updateBonus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('finance', {
      method: 'PUT',
      path: `/bonuses/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('bonuses/:id')
  @ApiOperation({ summary: 'Delete bonus' })
  async removeBonus(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('finance', {
      method: 'DELETE',
      path: `/bonuses/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Payroll
  @Get('payroll')
  @ApiOperation({ summary: 'Get all payroll records' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllPayroll(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('finance', {
      method: 'GET',
      path: '/payroll',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('payroll/:id')
  @ApiOperation({ summary: 'Get payroll record by ID' })
  async findOnePayroll(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('finance', {
      method: 'GET',
      path: `/payroll/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('payroll')
  @ApiOperation({ summary: 'Create payroll record' })
  async createPayroll(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('finance', {
      method: 'POST',
      path: '/payroll',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('payroll/:id')
  @ApiOperation({ summary: 'Update payroll record' })
  async updatePayroll(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('finance', {
      method: 'PUT',
      path: `/payroll/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('payroll/:id')
  @ApiOperation({ summary: 'Delete payroll record' })
  async removePayroll(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('finance', {
      method: 'DELETE',
      path: `/payroll/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Work Templates (price list)
  @Get('work-templates')
  @ApiOperation({ summary: 'Get work templates' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  async findAllWorkTemplates(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.proxyService.forward('finance', {
      method: 'GET',
      path: '/work-templates',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit, search, category },
    });
  }

  @Get('work-templates/categories')
  @ApiOperation({ summary: 'Get work template categories' })
  async getWorkTemplateCategories(@Req() req: Request) {
    return this.proxyService.forward('finance', {
      method: 'GET',
      path: '/work-templates/categories',
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Get('work-templates/:id')
  @ApiOperation({ summary: 'Get work template by ID' })
  async findOneWorkTemplate(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('finance', {
      method: 'GET',
      path: `/work-templates/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('work-templates')
  @ApiOperation({ summary: 'Create work template' })
  async createWorkTemplate(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('finance', {
      method: 'POST',
      path: '/work-templates',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('work-templates/:id')
  @ApiOperation({ summary: 'Update work template' })
  async updateWorkTemplate(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('finance', {
      method: 'PUT',
      path: `/work-templates/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('work-templates/:id')
  @ApiOperation({ summary: 'Delete work template' })
  async deleteWorkTemplate(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('finance', {
      method: 'DELETE',
      path: `/work-templates/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Commercial Proposals
  @Get('commercial-proposals')
  @ApiOperation({ summary: 'Get commercial proposals' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAllProposals(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('projectId') projectId?: number,
    @Query('status') status?: string,
  ) {
    return this.proxyService.forward('finance', {
      method: 'GET',
      path: '/commercial-proposals',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit, projectId, status },
    });
  }

  @Get('commercial-proposals/:id')
  @ApiOperation({ summary: 'Get commercial proposal by ID' })
  async findOneProposal(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('finance', {
      method: 'GET',
      path: `/commercial-proposals/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('commercial-proposals')
  @ApiOperation({ summary: 'Create commercial proposal' })
  async createProposal(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('finance', {
      method: 'POST',
      path: '/commercial-proposals',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('commercial-proposals/:id')
  @ApiOperation({ summary: 'Update commercial proposal' })
  async updateProposal(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('finance', {
      method: 'PUT',
      path: `/commercial-proposals/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('commercial-proposals/:id')
  @ApiOperation({ summary: 'Delete commercial proposal' })
  async deleteProposal(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('finance', {
      method: 'DELETE',
      path: `/commercial-proposals/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('commercial-proposals/:id/lines')
  @ApiOperation({ summary: 'Add line to commercial proposal' })
  async addProposalLine(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('finance', {
      method: 'POST',
      path: `/commercial-proposals/${id}/lines`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('commercial-proposals/:id/lines/:lineId')
  @ApiOperation({ summary: 'Update proposal line' })
  async updateProposalLine(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('finance', {
      method: 'PUT',
      path: `/commercial-proposals/${id}/lines/${lineId}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('commercial-proposals/:id/lines/:lineId')
  @ApiOperation({ summary: 'Delete proposal line' })
  async deleteProposalLine(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('lineId') lineId: string,
  ) {
    return this.proxyService.forward('finance', {
      method: 'DELETE',
      path: `/commercial-proposals/${id}/lines/${lineId}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // ── Contracts ─────────────────────────────────────────────
  @Get('contracts')
  @ApiOperation({ summary: 'List contracts' })
  @ApiQuery({ name: 'projectId', required: false })
  async listContracts(@Req() req: Request, @Query('projectId') projectId?: string) {
    return this.proxyService.forward('finance', {
      method: 'GET',
      path: '/contracts',
      headers: { authorization: req.headers.authorization || '' },
      params: { projectId },
    });
  }

  @Get('contracts/:id')
  async getContract(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('finance', {
      method: 'GET',
      path: `/contracts/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('contracts')
  async createContract(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('finance', {
      method: 'POST',
      path: '/contracts',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('contracts/:id')
  async updateContract(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('finance', {
      method: 'PUT',
      path: `/contracts/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('contracts/:id')
  async deleteContract(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('finance', {
      method: 'DELETE',
      path: `/contracts/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // ── Estimates ─────────────────────────────────────────────
  @Get('estimates')
  @ApiOperation({ summary: 'List estimates' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'contractId', required: false })
  async listEstimates(
    @Req() req: Request,
    @Query('projectId') projectId?: string,
    @Query('contractId') contractId?: string,
  ) {
    return this.proxyService.forward('finance', {
      method: 'GET',
      path: '/estimates',
      headers: { authorization: req.headers.authorization || '' },
      params: { projectId, contractId },
    });
  }

  @Get('estimates/:id')
  async getEstimate(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('finance', {
      method: 'GET',
      path: `/estimates/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('estimates')
  async createEstimate(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('finance', {
      method: 'POST',
      path: '/estimates',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('estimates/:id')
  async updateEstimate(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('finance', {
      method: 'PUT',
      path: `/estimates/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('estimates/:id')
  async deleteEstimate(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('finance', {
      method: 'DELETE',
      path: `/estimates/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('estimates/:id/sections')
  async addEstimateSection(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('finance', {
      method: 'POST',
      path: `/estimates/${id}/sections`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('estimates/:id/sections/:sectionId')
  async updateEstimateSection(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('finance', {
      method: 'PUT',
      path: `/estimates/${id}/sections/${sectionId}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('estimates/:id/sections/:sectionId')
  async deleteEstimateSection(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
  ) {
    return this.proxyService.forward('finance', {
      method: 'DELETE',
      path: `/estimates/${id}/sections/${sectionId}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('estimates/:id/sections/:sectionId/items')
  async addEstimateItem(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('finance', {
      method: 'POST',
      path: `/estimates/${id}/sections/${sectionId}/items`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('estimates/:id/sections/:sectionId/items/:itemId')
  async updateEstimateItem(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Param('itemId') itemId: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('finance', {
      method: 'PUT',
      path: `/estimates/${id}/sections/${sectionId}/items/${itemId}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Get('financial-reports/project/:projectId/articles')
  @ApiOperation({ summary: 'List distinct expense articles for a project' })
  async listExpenseArticles(@Req() req: Request, @Param('projectId') projectId: string) {
    return this.proxyService.forward('finance', {
      method: 'GET',
      path: `/financial-reports/project/${projectId}/articles`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Get('financial-reports/project/:projectId/export')
  @ApiOperation({ summary: 'Export project financial report as PDF' })
  @ApiQuery({ name: 'format', enum: ['expense-statement', 'balance-detail'], required: true })
  @ApiQuery({ name: 'article', required: false })
  @ApiQuery({ name: 'periodFrom', required: false })
  @ApiQuery({ name: 'periodTo', required: false })
  async exportFinancialReport(
    @Req() req: Request,
    @Res() res: Response,
    @Param('projectId') projectId: string,
    @Query('format') format: string,
    @Query('article') article?: string,
    @Query('periodFrom') periodFrom?: string,
    @Query('periodTo') periodTo?: string,
  ) {
    try {
      const serviceUrl = this.proxyService.getServiceUrl('finance');
      const accountOverride = this.requestContext.getAccountIdOverride();
      const headers: Record<string, string> = {
        authorization: req.headers.authorization || '',
      };
      if (accountOverride) headers['x-account-id'] = accountOverride;
      const response = await this.httpService.axiosRef.get(
        `${serviceUrl}/financial-reports/project/${projectId}/export`,
        {
          params: { format, article, periodFrom, periodTo },
          headers,
          responseType: 'stream',
        },
      );
      const contentType = response.headers['content-type'] as string | undefined;
      const disposition = response.headers['content-disposition'] as string | undefined;
      if (contentType) res.setHeader('Content-Type', contentType);
      if (disposition) res.setHeader('Content-Disposition', disposition);
      response.data.pipe(res);
    } catch (err) {
      const e = err as { response?: { status?: number } };
      const status = e?.response?.status ?? 500;
      res.status(status).json({ message: 'Ошибка при экспорте отчёта' });
    }
  }

  @Get('estimates/:id/export')
  @ApiOperation({ summary: 'Export estimate as PDF' })
  @ApiQuery({ name: 'format', enum: ['summary', 'ks2', 'act'], required: true })
  async exportEstimate(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
    @Query('format') format: string,
  ) {
    try {
      const serviceUrl = this.proxyService.getServiceUrl('finance');
      const accountOverride = this.requestContext.getAccountIdOverride();
      const headers: Record<string, string> = {
        authorization: req.headers.authorization || '',
      };
      if (accountOverride) headers['x-account-id'] = accountOverride;
      const response = await this.httpService.axiosRef.get(
        `${serviceUrl}/estimates/${id}/export`,
        { params: { format }, headers, responseType: 'stream' },
      );
      const contentType = response.headers['content-type'] as string | undefined;
      const disposition = response.headers['content-disposition'] as string | undefined;
      if (contentType) res.setHeader('Content-Type', contentType);
      if (disposition) res.setHeader('Content-Disposition', disposition);
      response.data.pipe(res);
    } catch (err) {
      const e = err as { response?: { status?: number } };
      const status = e?.response?.status ?? 500;
      res.status(status).json({ message: 'Ошибка при экспорте сметы' });
    }
  }

  @Delete('estimates/:id/sections/:sectionId/items/:itemId')
  async deleteEstimateItem(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.proxyService.forward('finance', {
      method: 'DELETE',
      path: `/estimates/${id}/sections/${sectionId}/items/${itemId}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }
}
