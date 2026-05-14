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

@ApiTags('Equipment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class EquipmentGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  // Equipment Warehouses (eq-warehouses → equipment-service /warehouses)
  @Get('eq-warehouses')
  @ApiOperation({ summary: 'Get all equipment warehouses' })
  async findAllEqWarehouses(@Req() req: Request) {
    return this.proxyService.forward('equipment', {
      method: 'GET',
      path: '/warehouses',
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Get('eq-warehouses/:id')
  @ApiOperation({ summary: 'Get equipment warehouse by ID' })
  async findOneEqWarehouse(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('equipment', {
      method: 'GET',
      path: `/warehouses/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('eq-warehouses')
  @ApiOperation({ summary: 'Create equipment warehouse' })
  async createEqWarehouse(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('equipment', {
      method: 'POST',
      path: '/warehouses',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('eq-warehouses/:id')
  @ApiOperation({ summary: 'Update equipment warehouse' })
  async updateEqWarehouse(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('equipment', {
      method: 'PUT',
      path: `/warehouses/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('eq-warehouses/:id')
  @ApiOperation({ summary: 'Delete equipment warehouse' })
  async deleteEqWarehouse(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('equipment', {
      method: 'DELETE',
      path: `/warehouses/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Inventory Sessions
  @Get('inventory-sessions')
  @ApiOperation({ summary: 'Get all inventory sessions' })
  @ApiQuery({ name: 'projectId', required: false })
  async findAllInventorySessions(
    @Req() req: Request,
    @Query('projectId') projectId?: string,
  ) {
    return this.proxyService.forward('equipment', {
      method: 'GET',
      path: '/inventory-sessions',
      headers: { authorization: req.headers.authorization || '' },
      params: projectId ? { projectId } : undefined,
    });
  }

  @Get('inventory-sessions/:id')
  @ApiOperation({ summary: 'Get inventory session by ID' })
  async findOneInventorySession(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('equipment', {
      method: 'GET',
      path: `/inventory-sessions/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('inventory-sessions')
  @ApiOperation({ summary: 'Create inventory session' })
  async createInventorySession(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('equipment', {
      method: 'POST',
      path: '/inventory-sessions',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('inventory-sessions/:id')
  @ApiOperation({ summary: 'Update inventory session' })
  async updateInventorySession(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('equipment', {
      method: 'PUT',
      path: `/inventory-sessions/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('inventory-sessions/:id')
  @ApiOperation({ summary: 'Delete inventory session' })
  async deleteInventorySession(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('equipment', {
      method: 'DELETE',
      path: `/inventory-sessions/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('inventory-sessions/:id/items')
  @ApiOperation({ summary: 'Add item to inventory session' })
  async addInventoryItem(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('equipment', {
      method: 'POST',
      path: `/inventory-sessions/${id}/items`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('inventory-sessions/:id/items/:itemId')
  @ApiOperation({ summary: 'Remove item from inventory session' })
  async deleteInventoryItem(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.proxyService.forward('equipment', {
      method: 'DELETE',
      path: `/inventory-sessions/${id}/items/${itemId}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Equipment
  @Get('equipment')
  @ApiOperation({ summary: 'Get all equipment' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllEquipment(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('equipment', {
      method: 'GET',
      path: '/equipment',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('equipment/:id')
  @ApiOperation({ summary: 'Get equipment by ID' })
  async findOneEquipment(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('equipment', {
      method: 'GET',
      path: `/equipment/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('equipment')
  @ApiOperation({ summary: 'Create equipment' })
  async createEquipment(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('equipment', {
      method: 'POST',
      path: '/equipment',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('equipment/:id')
  @ApiOperation({ summary: 'Update equipment' })
  async updateEquipment(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('equipment', {
      method: 'PUT',
      path: `/equipment/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('equipment/:id')
  @ApiOperation({ summary: 'Delete equipment' })
  async removeEquipment(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('equipment', {
      method: 'DELETE',
      path: `/equipment/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Equipment Maintenance
  @Get('equipment-maintenance')
  @ApiOperation({ summary: 'Get all equipment maintenance records' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllEquipmentMaintenance(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('equipment', {
      method: 'GET',
      path: '/equipment-maintenance',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('equipment-maintenance/:id')
  @ApiOperation({ summary: 'Get equipment maintenance record by ID' })
  async findOneEquipmentMaintenance(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    return this.proxyService.forward('equipment', {
      method: 'GET',
      path: `/equipment-maintenance/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('equipment-maintenance')
  @ApiOperation({ summary: 'Create equipment maintenance record' })
  async createEquipmentMaintenance(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('equipment', {
      method: 'POST',
      path: '/equipment-maintenance',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('equipment-maintenance/:id')
  @ApiOperation({ summary: 'Update equipment maintenance record' })
  async updateEquipmentMaintenance(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('equipment', {
      method: 'PUT',
      path: `/equipment-maintenance/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('equipment-maintenance/:id')
  @ApiOperation({ summary: 'Delete equipment maintenance record' })
  async removeEquipmentMaintenance(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    return this.proxyService.forward('equipment', {
      method: 'DELETE',
      path: `/equipment-maintenance/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }
}
