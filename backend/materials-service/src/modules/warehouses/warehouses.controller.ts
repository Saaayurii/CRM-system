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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { WarehousesService } from './warehouses.service';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  CreateWarehouseMovementDto,
  CreateInventoryCheckDto,
  UpdateInventoryCheckDto,
} from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface RequestUser {
  id: number;
  email: string;
  roleId: number;
  accountId: number;
}

@ApiTags('Warehouses')
@ApiBearerAuth()
@Controller()
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  // Warehouses
  @Get('warehouses')
  @ApiOperation({ summary: 'Get all warehouses' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Warehouses retrieved successfully',
  })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.warehousesService.findAll(
      user.accountId,
      page || 1,
      limit || 20,
    );
  }

  @Get('warehouses/:id')
  @ApiOperation({ summary: 'Get warehouse by ID' })
  @ApiResponse({ status: 200, description: 'Warehouse retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.warehousesService.findById(id, user.accountId);
  }

  @Post('warehouses')
  @ApiOperation({ summary: 'Create new warehouse' })
  @ApiResponse({ status: 201, description: 'Warehouse created successfully' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() createDto: CreateWarehouseDto,
  ) {
    return this.warehousesService.create(createDto, user.accountId);
  }

  @Put('warehouses/:id')
  @ApiOperation({ summary: 'Update warehouse' })
  @ApiResponse({ status: 200, description: 'Warehouse updated successfully' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateWarehouseDto,
  ) {
    return this.warehousesService.update(id, updateDto, user.accountId);
  }

  @Delete('warehouses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete warehouse' })
  @ApiResponse({ status: 204, description: 'Warehouse deleted successfully' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.warehousesService.remove(id, user.accountId);
  }

  // Warehouse Stock
  @Get('warehouses/:id/stock')
  @ApiOperation({ summary: 'Get warehouse stock' })
  @ApiResponse({
    status: 200,
    description: 'Warehouse stock retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async getStock(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.warehousesService.getStock(id, user.accountId);
  }

  // Warehouse Movements
  @Post('warehouse-movements')
  @ApiOperation({ summary: 'Create warehouse movement' })
  @ApiResponse({
    status: 201,
    description: 'Warehouse movement created successfully',
  })
  async createMovement(
    @CurrentUser() user: RequestUser,
    @Body() createDto: CreateWarehouseMovementDto,
  ) {
    return this.warehousesService.createMovement(createDto, user.accountId);
  }

  // Inventory Checks
  @Get('inventory-checks')
  @ApiOperation({ summary: 'Get all inventory checks' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'warehouseId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Inventory checks retrieved successfully',
  })
  async findAllInventoryChecks(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('warehouseId') warehouseId?: number,
    @Query('status') status?: number,
  ) {
    return this.warehousesService.findAllInventoryChecks(
      page || 1,
      limit || 20,
      warehouseId,
      status,
    );
  }

  @Get('inventory-checks/:id')
  @ApiOperation({ summary: 'Get inventory check by ID' })
  @ApiResponse({
    status: 200,
    description: 'Inventory check retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Inventory check not found' })
  async findOneInventoryCheck(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.warehousesService.findInventoryCheckById(id, user.accountId);
  }

  @Post('inventory-checks')
  @ApiOperation({ summary: 'Create new inventory check' })
  @ApiResponse({
    status: 201,
    description: 'Inventory check created successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Inventory check with this number already exists',
  })
  async createInventoryCheck(
    @CurrentUser() user: RequestUser,
    @Body() createDto: CreateInventoryCheckDto,
  ) {
    return this.warehousesService.createInventoryCheck(
      createDto,
      user.accountId,
    );
  }

  @Put('inventory-checks/:id')
  @ApiOperation({ summary: 'Update inventory check' })
  @ApiResponse({
    status: 200,
    description: 'Inventory check updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Inventory check not found' })
  async updateInventoryCheck(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateInventoryCheckDto,
  ) {
    return this.warehousesService.updateInventoryCheck(
      id,
      updateDto,
      user.accountId,
    );
  }
}
