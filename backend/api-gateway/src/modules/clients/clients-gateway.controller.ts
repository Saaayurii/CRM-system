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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { ProxyService } from '../../common/services/proxy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class ClientsGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  // Clients
  @Get('clients')
  @ApiOperation({ summary: 'Get all clients' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllClients(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('clients', {
      method: 'GET',
      path: '/clients',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('clients/:id')
  @ApiOperation({ summary: 'Get client by ID' })
  async findOneClient(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('clients', {
      method: 'GET',
      path: `/clients/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('clients')
  @ApiOperation({ summary: 'Create client' })
  async createClient(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('clients', {
      method: 'POST',
      path: '/clients',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('clients/:id')
  @ApiOperation({ summary: 'Update client' })
  async updateClient(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('clients', {
      method: 'PUT',
      path: `/clients/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('clients/:id')
  @ApiOperation({ summary: 'Delete client' })
  async removeClient(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('clients', {
      method: 'DELETE',
      path: `/clients/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Client Interactions
  @Get('client-interactions')
  @ApiOperation({ summary: 'Get all client interactions' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllClientInteractions(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('clients', {
      method: 'GET',
      path: '/client-interactions',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('client-interactions/:id')
  @ApiOperation({ summary: 'Get client interaction by ID' })
  async findOneClientInteraction(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('clients', {
      method: 'GET',
      path: `/client-interactions/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('client-interactions')
  @ApiOperation({ summary: 'Create client interaction' })
  async createClientInteraction(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('clients', {
      method: 'POST',
      path: '/client-interactions',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('client-interactions/:id')
  @ApiOperation({ summary: 'Update client interaction' })
  async updateClientInteraction(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('clients', {
      method: 'PUT',
      path: `/client-interactions/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('client-interactions/:id')
  @ApiOperation({ summary: 'Delete client interaction' })
  async removeClientInteraction(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('clients', {
      method: 'DELETE',
      path: `/client-interactions/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Client Portal Access
  @Get('client-portal-access')
  @ApiOperation({ summary: 'Get all client portal access records' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllClientPortalAccess(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('clients', {
      method: 'GET',
      path: '/client-portal-access',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('client-portal-access/:id')
  @ApiOperation({ summary: 'Get client portal access by ID' })
  async findOneClientPortalAccess(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    return this.proxyService.forward('clients', {
      method: 'GET',
      path: `/client-portal-access/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('client-portal-access')
  @ApiOperation({ summary: 'Create client portal access' })
  async createClientPortalAccess(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('clients', {
      method: 'POST',
      path: '/client-portal-access',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('client-portal-access/:id')
  @ApiOperation({ summary: 'Update client portal access' })
  async updateClientPortalAccess(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('clients', {
      method: 'PUT',
      path: `/client-portal-access/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('client-portal-access/:id')
  @ApiOperation({ summary: 'Delete client portal access' })
  async removeClientPortalAccess(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('clients', {
      method: 'DELETE',
      path: `/client-portal-access/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Client Invites
  @Get('client-invites')
  @ApiOperation({ summary: 'List client invites' })
  async listClientInvites(@Req() req: Request) {
    return this.proxyService.forward('clients', {
      method: 'GET',
      path: '/client-invites',
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('client-invites')
  @ApiOperation({ summary: 'Create client invite' })
  async createClientInvite(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('clients', {
      method: 'POST',
      path: '/client-invites',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('client-invites/:token')
  @ApiOperation({ summary: 'Revoke client invite' })
  async revokeClientInvite(@Req() req: Request, @Param('token') token: string) {
    return this.proxyService.forward('clients', {
      method: 'DELETE',
      path: `/client-invites/${token}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Public()
  @Get('client-invites/:token/check')
  @ApiOperation({ summary: 'Check client invite (public)' })
  async checkClientInvite(@Param('token') token: string) {
    return this.proxyService.forward('clients', {
      method: 'GET',
      path: `/client-invites/${token}/check`,
      headers: {},
    });
  }

  @Public()
  @Post('client-invites/:token/accept')
  @ApiOperation({ summary: 'Accept client invite — create client + portal user (public)' })
  async acceptClientInvite(
    @Req() req: Request,
    @Param('token') token: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('clients', {
      method: 'POST',
      path: `/client-invites/${token}/accept`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  // ─── Воронка продаж: стадии ───
  @Get('deal-stages')
  @ApiOperation({ summary: 'List pipeline stages' })
  async findDealStages(@Req() req: Request) {
    return this.proxyService.forward('clients', {
      method: 'GET',
      path: '/deal-stages',
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('deal-stages')
  @ApiOperation({ summary: 'Create pipeline stage' })
  async createDealStage(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('clients', {
      method: 'POST',
      path: '/deal-stages',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('deal-stages/:id')
  @ApiOperation({ summary: 'Update pipeline stage' })
  async updateDealStage(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('clients', {
      method: 'PUT',
      path: `/deal-stages/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('deal-stages/:id')
  @ApiOperation({ summary: 'Delete pipeline stage' })
  async deleteDealStage(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('clients', {
      method: 'DELETE',
      path: `/deal-stages/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // ─── Воронка продаж: сделки ───
  @Get('deals')
  @ApiOperation({ summary: 'List deals' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'managerId', required: false })
  @ApiQuery({ name: 'clientId', required: false })
  async findDeals(
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('managerId') managerId?: number,
    @Query('clientId') clientId?: number,
  ) {
    return this.proxyService.forward('clients', {
      method: 'GET',
      path: '/deals',
      headers: { authorization: req.headers.authorization || '' },
      params: { status, managerId, clientId },
    });
  }

  @Get('deals/stats')
  @ApiOperation({ summary: 'Deals stats per stage' })
  async dealsStats(@Req() req: Request) {
    return this.proxyService.forward('clients', {
      method: 'GET',
      path: '/deals/stats',
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Get('deals/:id')
  @ApiOperation({ summary: 'Get deal by ID' })
  async findDeal(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('clients', {
      method: 'GET',
      path: `/deals/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('deals')
  @ApiOperation({ summary: 'Create deal' })
  async createDeal(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('clients', {
      method: 'POST',
      path: '/deals',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('deals/:id')
  @ApiOperation({ summary: 'Update deal (incl. stage move)' })
  async updateDeal(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('clients', {
      method: 'PUT',
      path: `/deals/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('deals/:id')
  @ApiOperation({ summary: 'Delete deal' })
  async deleteDeal(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('clients', {
      method: 'DELETE',
      path: `/deals/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }
}
