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

@ApiTags('Materials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class MaterialsGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  // Materials
  @Get('materials')
  @ApiOperation({ summary: 'Get all materials' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllMaterials(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.forward('materials', {
      method: 'GET', path: '/materials',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('materials/:id')
  @ApiOperation({ summary: 'Get material by ID' })
  async findOneMaterial(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('materials', {
      method: 'GET', path: `/materials/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('materials')
  @ApiOperation({ summary: 'Create material' })
  async createMaterial(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('materials', {
      method: 'POST', path: '/materials',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('materials/:id')
  @ApiOperation({ summary: 'Update material' })
  async updateMaterial(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('materials', {
      method: 'PUT', path: `/materials/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('materials/:id')
  @ApiOperation({ summary: 'Delete material' })
  async removeMaterial(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('materials', {
      method: 'DELETE', path: `/materials/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Material Categories
  @Get('material-categories')
  @ApiOperation({ summary: 'Get all material categories' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllCategories(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.forward('materials', {
      method: 'GET', path: '/material-categories',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('material-categories/:id')
  @ApiOperation({ summary: 'Get material category by ID' })
  async findOneCategory(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('materials', {
      method: 'GET', path: `/material-categories/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('material-categories')
  @ApiOperation({ summary: 'Create material category' })
  async createCategory(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('materials', {
      method: 'POST', path: '/material-categories',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('material-categories/:id')
  @ApiOperation({ summary: 'Update material category' })
  async updateCategory(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('materials', {
      method: 'PUT', path: `/material-categories/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('material-categories/:id')
  @ApiOperation({ summary: 'Delete material category' })
  async removeCategory(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('materials', {
      method: 'DELETE', path: `/material-categories/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Material Requests
  @Get('material-requests')
  @ApiOperation({ summary: 'Get all material requests' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAllRequests(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number, @Query('status') status?: number) {
    return this.proxyService.forward('materials', {
      method: 'GET', path: '/material-requests',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit, status },
    });
  }

  @Get('material-requests/:id')
  @ApiOperation({ summary: 'Get material request by ID' })
  async findOneRequest(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('materials', {
      method: 'GET', path: `/material-requests/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('material-requests')
  @ApiOperation({ summary: 'Create material request' })
  async createRequest(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('materials', {
      method: 'POST', path: '/material-requests',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('material-requests/:id')
  @ApiOperation({ summary: 'Update material request' })
  async updateRequest(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('materials', {
      method: 'PUT', path: `/material-requests/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('material-requests/:id')
  @ApiOperation({ summary: 'Delete material request' })
  async removeRequest(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('materials', {
      method: 'DELETE', path: `/material-requests/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('material-requests/:id/items')
  @ApiOperation({ summary: 'Add item to material request' })
  async addRequestItem(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('materials', {
      method: 'POST', path: `/material-requests/${id}/items`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  // Warehouses
  @Get('warehouses')
  @ApiOperation({ summary: 'Get all warehouses' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllWarehouses(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.forward('materials', {
      method: 'GET', path: '/warehouses',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('warehouses/:id')
  @ApiOperation({ summary: 'Get warehouse by ID' })
  async findOneWarehouse(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('materials', {
      method: 'GET', path: `/warehouses/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('warehouses')
  @ApiOperation({ summary: 'Create warehouse' })
  async createWarehouse(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('materials', {
      method: 'POST', path: '/warehouses',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('warehouses/:id')
  @ApiOperation({ summary: 'Update warehouse' })
  async updateWarehouse(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('materials', {
      method: 'PUT', path: `/warehouses/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('warehouses/:id')
  @ApiOperation({ summary: 'Delete warehouse' })
  async removeWarehouse(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('materials', {
      method: 'DELETE', path: `/warehouses/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Get('warehouses/:id/stock')
  @ApiOperation({ summary: 'Get warehouse stock' })
  async getWarehouseStock(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('materials', {
      method: 'GET', path: `/warehouses/${id}/stock`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Warehouse Movements
  @Post('warehouse-movements')
  @ApiOperation({ summary: 'Create warehouse movement' })
  async createMovement(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('materials', {
      method: 'POST', path: '/warehouse-movements',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  // Inventory Checks
  @Get('inventory-checks')
  @ApiOperation({ summary: 'Get all inventory checks' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllInventoryChecks(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.forward('materials', {
      method: 'GET', path: '/inventory-checks',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('inventory-checks/:id')
  @ApiOperation({ summary: 'Get inventory check by ID' })
  async findOneInventoryCheck(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('materials', {
      method: 'GET', path: `/inventory-checks/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('inventory-checks')
  @ApiOperation({ summary: 'Create inventory check' })
  async createInventoryCheck(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('materials', {
      method: 'POST', path: '/inventory-checks',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('inventory-checks/:id')
  @ApiOperation({ summary: 'Update inventory check' })
  async updateInventoryCheck(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('materials', {
      method: 'PUT', path: `/inventory-checks/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }
}
