import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  Sse,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Observable, map } from 'rxjs';
import { MessageEvent } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ProxyService } from '../../common/services/proxy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

const SETTINGS_WRITE_ROLES = [1, 2]; // super_admin, admin
const BANK_ADMIN_ROLES = [1, 2, 8]; // super_admin, admin, accountant
import { MaintenanceSubService } from '../../redis/maintenance-sub.service';
import { RequestContextService } from '../../common/services/request-context.service';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class SettingsGatewayController {
  constructor(
    private readonly proxyService: ProxyService,
    private readonly maintenanceSub: MaintenanceSubService,
    private readonly httpService: HttpService,
    private readonly requestContext: RequestContextService,
  ) {}

  /** SSE stream — browser connects once, receives push events on maintenance changes */
  @SkipThrottle()
  @Sse('system-settings/events')
  @ApiOperation({ summary: 'SSE stream for maintenance mode changes' })
  maintenanceEvents(
    @CurrentUser('accountId') accountId: number,
  ): Observable<MessageEvent> {
    return this.maintenanceSub.forAccount(accountId).pipe(
      map((event) => ({
        data: event,
        type: 'maintenance',
      }) as unknown as MessageEvent),
    );
  }

  // System Settings (GET, PUT - no POST/DELETE)
  @Get('system-settings')
  @ApiOperation({ summary: 'Get all system settings' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllSystemSettings(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('settings', {
      method: 'GET',
      path: '/system-settings',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('system-settings/:id')
  @ApiOperation({ summary: 'Get system setting by ID' })
  async findOneSystemSetting(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('settings', {
      method: 'GET',
      path: `/system-settings/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Put('system-settings')
  @Roles(...SETTINGS_WRITE_ROLES)
  @ApiOperation({ summary: 'Update current account system settings' })
  async updateCurrentSystemSettings(
    @Req() req: Request,
    @Body() body: any,
  ) {
    return this.proxyService.forward('settings', {
      method: 'PUT',
      path: '/system-settings',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('system-settings/:id')
  @Roles(...SETTINGS_WRITE_ROLES)
  @ApiOperation({ summary: 'Update system setting' })
  async updateSystemSetting(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('settings', {
      method: 'PUT',
      path: `/system-settings/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  // User Preferences (GET, PUT - no POST/DELETE)
  @Get('user-preferences')
  @ApiOperation({ summary: 'Get all user preferences' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllUserPreferences(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('settings', {
      method: 'GET',
      path: '/user-preferences',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('user-preferences/:id')
  @ApiOperation({ summary: 'Get user preference by ID' })
  async findOneUserPreference(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('settings', {
      method: 'GET',
      path: `/user-preferences/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Put('user-preferences')
  @ApiOperation({ summary: 'Update current user preferences' })
  async updateCurrentUserPreferences(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('settings', {
      method: 'PUT',
      path: '/user-preferences',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('user-preferences/:id')
  @ApiOperation({ summary: 'Update user preference' })
  async updateUserPreference(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('settings', {
      method: 'PUT',
      path: `/user-preferences/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  // Company Bank Accounts (CRUD)
  @Get('company-bank-accounts')
  @ApiOperation({ summary: 'List company bank accounts' })
  async listCompanyBankAccounts(@Req() req: Request) {
    return this.proxyService.forward('settings', {
      method: 'GET',
      path: '/company-bank-accounts',
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('company-bank-accounts')
  @Roles(...BANK_ADMIN_ROLES)
  @ApiOperation({ summary: 'Create company bank account' })
  async createCompanyBankAccount(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('settings', {
      method: 'POST',
      path: '/company-bank-accounts',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('company-bank-accounts/:id')
  @Roles(...BANK_ADMIN_ROLES)
  @ApiOperation({ summary: 'Update company bank account' })
  async updateCompanyBankAccount(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('settings', {
      method: 'PUT',
      path: `/company-bank-accounts/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('company-bank-accounts/:id')
  @Roles(...BANK_ADMIN_ROLES)
  @ApiOperation({ summary: 'Delete company bank account' })
  async deleteCompanyBankAccount(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('settings', {
      method: 'DELETE',
      path: `/company-bank-accounts/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Price — Project categories (price columns)
  @Get('price-project-categories')
  @ApiOperation({ summary: 'List project categories (price columns)' })
  async listPriceProjectCategories(@Req() req: Request) {
    return this.proxyService.forward('settings', {
      method: 'GET',
      path: '/price-project-categories',
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('price-project-categories')
  @ApiOperation({ summary: 'Create project category' })
  async createPriceProjectCategory(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('settings', {
      method: 'POST',
      path: '/price-project-categories',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('price-project-categories/:id')
  @ApiOperation({ summary: 'Update project category' })
  async updatePriceProjectCategory(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('settings', {
      method: 'PUT',
      path: `/price-project-categories/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('price-project-categories/:id')
  @ApiOperation({ summary: 'Delete project category' })
  async deletePriceProjectCategory(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('settings', {
      method: 'DELETE',
      path: `/price-project-categories/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Price — Categories
  @Get('price-categories')
  @ApiOperation({ summary: 'List price categories' })
  async listPriceCategories(@Req() req: Request) {
    return this.proxyService.forward('settings', {
      method: 'GET',
      path: '/price-categories',
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('price-categories')
  @ApiOperation({ summary: 'Create price category' })
  async createPriceCategory(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('settings', {
      method: 'POST',
      path: '/price-categories',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('price-categories/:id')
  @ApiOperation({ summary: 'Update price category' })
  async updatePriceCategory(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('settings', {
      method: 'PUT',
      path: `/price-categories/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('price-categories/:id')
  @ApiOperation({ summary: 'Delete price category' })
  async deletePriceCategory(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('settings', {
      method: 'DELETE',
      path: `/price-categories/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Price — Items
  @Get('price-items')
  @ApiOperation({ summary: 'List price items' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'rootOnly', required: false })
  async listPriceItems(
    @Req() req: Request,
    @Query('categoryId') categoryId?: string,
    @Query('rootOnly') rootOnly?: string,
  ) {
    return this.proxyService.forward('settings', {
      method: 'GET',
      path: '/price-items',
      headers: { authorization: req.headers.authorization || '' },
      params: { categoryId, rootOnly },
    });
  }

  @Get('price-items/:id')
  @ApiOperation({ summary: 'Get price item' })
  async getPriceItem(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('settings', {
      method: 'GET',
      path: `/price-items/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('price-items')
  @ApiOperation({ summary: 'Create price item' })
  async createPriceItem(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('settings', {
      method: 'POST',
      path: '/price-items',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('price-items/:id')
  @ApiOperation({ summary: 'Update price item' })
  async updatePriceItem(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('settings', {
      method: 'PUT',
      path: `/price-items/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('price-items/:id')
  @ApiOperation({ summary: 'Delete price item' })
  async deletePriceItem(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('settings', {
      method: 'DELETE',
      path: `/price-items/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('price-items/:id/calc')
  @ApiOperation({ summary: 'Calculate parametric price for selected options' })
  async calcPriceItem(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('settings', {
      method: 'POST',
      path: `/price-items/${id}/calc`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  // Price — Parameter library
  @Get('price-parameters')
  @ApiOperation({ summary: 'List parameter library' })
  async listPriceParameters(@Req() req: Request) {
    return this.proxyService.forward('settings', {
      method: 'GET',
      path: '/price-parameters',
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Get('price-parameters/:id')
  @ApiOperation({ summary: 'Get parameter' })
  async getPriceParameter(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('settings', {
      method: 'GET',
      path: `/price-parameters/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('price-parameters')
  @ApiOperation({ summary: 'Create parameter' })
  async createPriceParameter(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('settings', {
      method: 'POST',
      path: '/price-parameters',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('price-parameters/:id')
  @ApiOperation({ summary: 'Update parameter' })
  async updatePriceParameter(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('settings', {
      method: 'PUT',
      path: `/price-parameters/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('price-parameters/:id')
  @ApiOperation({ summary: 'Delete parameter' })
  async deletePriceParameter(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('settings', {
      method: 'DELETE',
      path: `/price-parameters/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Price — Units of measure
  @Get('price-units')
  @ApiOperation({ summary: 'List units' })
  async listPriceUnits(@Req() req: Request) {
    return this.proxyService.forward('settings', {
      method: 'GET',
      path: '/price-units',
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('price-units')
  @ApiOperation({ summary: 'Create unit' })
  async createPriceUnit(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('settings', {
      method: 'POST',
      path: '/price-units',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('price-units/:id')
  @ApiOperation({ summary: 'Update unit' })
  async updatePriceUnit(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('settings', {
      method: 'PUT',
      path: `/price-units/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('price-units/:id')
  @ApiOperation({ summary: 'Delete unit' })
  async deletePriceUnit(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('settings', {
      method: 'DELETE',
      path: `/price-units/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Price — Aggregate (для UI вкладки «Прайс»)
  @Get('price-list')
  @ApiOperation({ summary: 'Get full price list (categories + items + prices)' })
  async getPriceList(@Req() req: Request) {
    return this.proxyService.forward('settings', {
      method: 'GET',
      path: '/price-list',
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('price-list/import')
  @ApiOperation({ summary: 'Import parsed CSV rows into the price list' })
  async importPriceList(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('settings', {
      method: 'POST',
      path: '/price-list/import',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Get('price-list/export')
  @ApiOperation({ summary: 'Export price list as PDF or XLSX' })
  @ApiQuery({ name: 'format', enum: ['pdf', 'xlsx'], required: true })
  async exportPriceList(
    @Req() req: Request,
    @Res() res: Response,
    @Query('format') format: string,
  ) {
    try {
      const serviceUrl = this.proxyService.getServiceUrl('settings');
      const accountOverride = this.requestContext.getAccountIdOverride();
      const headers: Record<string, string> = {
        authorization: req.headers.authorization || '',
      };
      if (accountOverride) headers['x-account-id'] = accountOverride;
      const response = await this.httpService.axiosRef.get(
        `${serviceUrl}/price-list/export`,
        { params: { format }, headers, responseType: 'stream' },
      );
      const contentType = response.headers['content-type'] as string | undefined;
      const disposition = response.headers['content-disposition'] as string | undefined;
      if (contentType) res.setHeader('Content-Type', contentType);
      if (disposition) res.setHeader('Content-Disposition', disposition);
      response.data.pipe(res);
    } catch (err) {
      const e = err as { response?: { status?: number; data?: unknown } };
      const status = e?.response?.status ?? 500;
      res.status(status).json({ message: 'Ошибка при экспорте прайса' });
    }
  }

  // Company Lookup (ЕГРЮЛ через ФНС)
  @Get('company-lookup/egrul')
  @ApiOperation({ summary: 'Поиск компании по ИНН/ОГРН в ЕГРЮЛ' })
  @ApiQuery({ name: 'query', required: false })
  @ApiQuery({ name: 'inn', required: false })
  async lookupEgrul(
    @Req() req: Request,
    @Query('query') query?: string,
    @Query('inn') inn?: string,
  ) {
    return this.proxyService.forward('settings', {
      method: 'GET',
      path: '/company-lookup/egrul',
      headers: { authorization: req.headers.authorization || '' },
      params: { query, inn },
    });
  }
}
