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

  // Equipment Categories
  @Get('equipment-categories')
  @ApiOperation({ summary: 'Get all equipment categories' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllEquipmentCategories(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('equipment', {
      method: 'GET',
      path: '/equipment-categories',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('equipment-categories/:id')
  @ApiOperation({ summary: 'Get equipment category by ID' })
  async findOneEquipmentCategory(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('equipment', {
      method: 'GET',
      path: `/equipment-categories/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('equipment-categories')
  @ApiOperation({ summary: 'Create equipment category' })
  async createEquipmentCategory(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('equipment', {
      method: 'POST',
      path: '/equipment-categories',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('equipment-categories/:id')
  @ApiOperation({ summary: 'Update equipment category' })
  async updateEquipmentCategory(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('equipment', {
      method: 'PUT',
      path: `/equipment-categories/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('equipment-categories/:id')
  @ApiOperation({ summary: 'Delete equipment category' })
  async removeEquipmentCategory(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('equipment', {
      method: 'DELETE',
      path: `/equipment-categories/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Equipment Assignments
  @Get('equipment-assignments')
  @ApiOperation({ summary: 'Get all equipment assignments' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllEquipmentAssignments(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('equipment', {
      method: 'GET',
      path: '/equipment-assignments',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('equipment-assignments/:id')
  @ApiOperation({ summary: 'Get equipment assignment by ID' })
  async findOneEquipmentAssignment(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    return this.proxyService.forward('equipment', {
      method: 'GET',
      path: `/equipment-assignments/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('equipment-assignments')
  @ApiOperation({ summary: 'Create equipment assignment' })
  async createEquipmentAssignment(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('equipment', {
      method: 'POST',
      path: '/equipment-assignments',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('equipment-assignments/:id')
  @ApiOperation({ summary: 'Update equipment assignment' })
  async updateEquipmentAssignment(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('equipment', {
      method: 'PUT',
      path: `/equipment-assignments/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('equipment-assignments/:id')
  @ApiOperation({ summary: 'Delete equipment assignment' })
  async removeEquipmentAssignment(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    return this.proxyService.forward('equipment', {
      method: 'DELETE',
      path: `/equipment-assignments/${id}`,
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
