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

@ApiTags('Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class SuppliersGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  // Suppliers
  @Get('suppliers')
  @ApiOperation({ summary: 'Get all suppliers' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllSuppliers(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.forward('suppliers', {
      method: 'GET', path: '/suppliers',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('suppliers/:id')
  @ApiOperation({ summary: 'Get supplier by ID' })
  async findOneSupplier(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('suppliers', {
      method: 'GET', path: `/suppliers/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('suppliers')
  @ApiOperation({ summary: 'Create supplier' })
  async createSupplier(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('suppliers', {
      method: 'POST', path: '/suppliers',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('suppliers/:id')
  @ApiOperation({ summary: 'Update supplier' })
  async updateSupplier(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('suppliers', {
      method: 'PUT', path: `/suppliers/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('suppliers/:id')
  @ApiOperation({ summary: 'Delete supplier' })
  async removeSupplier(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('suppliers', {
      method: 'DELETE', path: `/suppliers/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Get('suppliers/:id/materials')
  @ApiOperation({ summary: 'Get supplier materials' })
  async getSupplierMaterials(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('suppliers', {
      method: 'GET', path: `/suppliers/${id}/materials`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('suppliers/:id/materials')
  @ApiOperation({ summary: 'Add supplier material' })
  async addSupplierMaterial(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('suppliers', {
      method: 'POST', path: `/suppliers/${id}/materials`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  // Supplier Orders
  @Get('supplier-orders')
  @ApiOperation({ summary: 'Get all supplier orders' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAllOrders(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number, @Query('status') status?: number) {
    return this.proxyService.forward('suppliers', {
      method: 'GET', path: '/supplier-orders',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit, status },
    });
  }

  @Get('supplier-orders/:id')
  @ApiOperation({ summary: 'Get supplier order by ID' })
  async findOneOrder(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('suppliers', {
      method: 'GET', path: `/supplier-orders/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('supplier-orders')
  @ApiOperation({ summary: 'Create supplier order' })
  async createOrder(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('suppliers', {
      method: 'POST', path: '/supplier-orders',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('supplier-orders/:id')
  @ApiOperation({ summary: 'Update supplier order' })
  async updateOrder(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('suppliers', {
      method: 'PUT', path: `/supplier-orders/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('supplier-orders/:id')
  @ApiOperation({ summary: 'Delete supplier order' })
  async removeOrder(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('suppliers', {
      method: 'DELETE', path: `/supplier-orders/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('supplier-orders/:id/items')
  @ApiOperation({ summary: 'Add item to supplier order' })
  async addOrderItem(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('suppliers', {
      method: 'POST', path: `/supplier-orders/${id}/items`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  // Contractors
  @Get('contractors')
  @ApiOperation({ summary: 'Get all contractors' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllContractors(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.forward('suppliers', {
      method: 'GET', path: '/contractors',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('contractors/:id')
  @ApiOperation({ summary: 'Get contractor by ID' })
  async findOneContractor(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('suppliers', {
      method: 'GET', path: `/contractors/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('contractors')
  @ApiOperation({ summary: 'Create contractor' })
  async createContractor(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('suppliers', {
      method: 'POST', path: '/contractors',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('contractors/:id')
  @ApiOperation({ summary: 'Update contractor' })
  async updateContractor(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('suppliers', {
      method: 'PUT', path: `/contractors/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('contractors/:id')
  @ApiOperation({ summary: 'Delete contractor' })
  async removeContractor(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('suppliers', {
      method: 'DELETE', path: `/contractors/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Get('contractors/:id/assignments')
  @ApiOperation({ summary: 'Get contractor assignments' })
  async getContractorAssignments(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('suppliers', {
      method: 'GET', path: `/contractors/${id}/assignments`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('contractors/:id/assignments')
  @ApiOperation({ summary: 'Create contractor assignment' })
  async createContractorAssignment(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('suppliers', {
      method: 'POST', path: `/contractors/${id}/assignments`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }
}
