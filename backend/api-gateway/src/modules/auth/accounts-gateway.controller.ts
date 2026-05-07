import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProxyService } from '../../common/services/proxy.service';

@ApiTags('Accounts')
@ApiBearerAuth()
@Controller('api/v1/accounts')
export class AccountsGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  @Get()
  @ApiOperation({ summary: 'Get all accounts (Global Super Admin)' })
  async getAccounts(@Headers('authorization') authorization: string) {
    return this.proxyService.forward('auth', {
      method: 'GET',
      path: '/auth/accounts',
      headers: { Authorization: authorization },
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update account status' })
  async updateAccount(
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
  ) {
    return this.proxyService.forward('auth', {
      method: 'PUT',
      path: `/auth/accounts/${id}`,
      data: body,
      headers: { Authorization: authorization, 'content-type': 'application/json' },
    });
  }
}
