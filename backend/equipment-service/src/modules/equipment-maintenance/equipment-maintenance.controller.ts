import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EquipmentMaintenanceService } from './equipment-maintenance.service';
import { CreateEquipmentMaintenanceDto, UpdateEquipmentMaintenanceDto } from './dto';

interface RequestUser {
  id: number;
  email: string;
  roleId: number;
  accountId: number;
}

@ApiTags('Equipment Maintenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('equipment-maintenance')
export class EquipmentMaintenanceController {
  constructor(private readonly maintenanceService: EquipmentMaintenanceService) {}

  @Get()
  @ApiOperation({ summary: 'Get all maintenance records with pagination' })
  @ApiResponse({ status: 200, description: 'List of maintenance records' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'equipmentId', required: false, type: Number })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('equipmentId') equipmentId?: string,
  ) {
    return this.maintenanceService.findAll(
      user.accountId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      equipmentId !== undefined ? parseInt(equipmentId, 10) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get maintenance record by ID' })
  @ApiResponse({ status: 200, description: 'Maintenance record details' })
  @ApiResponse({ status: 404, description: 'Maintenance record not found' })
  async findById(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.maintenanceService.findById(id, user.accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new maintenance record' })
  @ApiResponse({ status: 201, description: 'Maintenance record created' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateEquipmentMaintenanceDto,
  ) {
    return this.maintenanceService.create(user.accountId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a maintenance record' })
  @ApiResponse({ status: 200, description: 'Maintenance record updated' })
  @ApiResponse({ status: 404, description: 'Maintenance record not found' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEquipmentMaintenanceDto,
  ) {
    return this.maintenanceService.update(id, user.accountId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a maintenance record' })
  @ApiResponse({ status: 200, description: 'Maintenance record deleted' })
  @ApiResponse({ status: 404, description: 'Maintenance record not found' })
  async delete(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.maintenanceService.delete(id, user.accountId);
  }
}
