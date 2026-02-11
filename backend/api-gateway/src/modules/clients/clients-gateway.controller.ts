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
}
