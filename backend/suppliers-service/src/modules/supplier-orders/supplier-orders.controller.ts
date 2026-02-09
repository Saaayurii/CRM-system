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
import { SupplierOrdersService } from './supplier-orders.service';
import { CreateSupplierOrderDto, UpdateSupplierOrderDto, CreateSupplierOrderItemDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface RequestUser {
  id: number;
  email: string;
  roleId: number;
  accountId: number;
}

@ApiTags('Supplier Orders')
@ApiBearerAuth()
@Controller('supplier-orders')
export class SupplierOrdersController {
  constructor(private readonly supplierOrdersService: SupplierOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all supplier orders' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: Number, description: 'Order status (0-5)' })
  @ApiResponse({ status: 200, description: 'Supplier orders retrieved successfully' })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: number,
  ) {
    return this.supplierOrdersService.findAll(user.accountId, page || 1, limit || 20, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier order by ID' })
  @ApiResponse({ status: 200, description: 'Supplier order retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Supplier order not found' })
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.supplierOrdersService.findById(id, user.accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new supplier order' })
  @ApiResponse({ status: 201, description: 'Supplier order created successfully' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() createSupplierOrderDto: CreateSupplierOrderDto,
  ) {
    return this.supplierOrdersService.create(createSupplierOrderDto, user.accountId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update supplier order' })
  @ApiResponse({ status: 200, description: 'Supplier order updated successfully' })
  @ApiResponse({ status: 404, description: 'Supplier order not found' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSupplierOrderDto: UpdateSupplierOrderDto,
  ) {
    return this.supplierOrdersService.update(id, updateSupplierOrderDto, user.accountId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete supplier order (soft delete)' })
  @ApiResponse({ status: 204, description: 'Supplier order deleted successfully' })
  @ApiResponse({ status: 404, description: 'Supplier order not found' })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.supplierOrdersService.remove(id, user.accountId);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add item to supplier order' })
  @ApiResponse({ status: 201, description: 'Item added successfully' })
  @ApiResponse({ status: 404, description: 'Supplier order not found' })
  async addItem(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() createItemDto: CreateSupplierOrderItemDto,
  ) {
    return this.supplierOrdersService.addItem(id, createItemDto, user.accountId);
  }
}
