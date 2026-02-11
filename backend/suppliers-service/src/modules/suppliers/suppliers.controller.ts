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
import { SuppliersService } from './suppliers.service';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
  CreateSupplierMaterialDto,
} from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface RequestUser {
  id: number;
  email: string;
  roleId: number;
  accountId: number;
}

@ApiTags('Suppliers')
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all suppliers' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    type: Number,
    description: '0-inactive, 1-active',
  })
  @ApiResponse({ status: 200, description: 'Suppliers retrieved successfully' })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: number,
  ) {
    return this.suppliersService.findAll(
      user.accountId,
      page || 1,
      limit || 20,
      status,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier by ID' })
  @ApiResponse({ status: 200, description: 'Supplier retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.suppliersService.findById(id, user.accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new supplier' })
  @ApiResponse({ status: 201, description: 'Supplier created successfully' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() createSupplierDto: CreateSupplierDto,
  ) {
    return this.suppliersService.create(createSupplierDto, user.accountId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update supplier' })
  @ApiResponse({ status: 200, description: 'Supplier updated successfully' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(id, updateSupplierDto, user.accountId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete supplier (soft delete)' })
  @ApiResponse({ status: 204, description: 'Supplier deleted successfully' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.suppliersService.remove(id, user.accountId);
  }

  @Get(':id/materials')
  @ApiOperation({ summary: 'Get supplier materials' })
  @ApiResponse({ status: 200, description: 'Materials retrieved successfully' })
  async getMaterials(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.suppliersService.getMaterials(id, user.accountId);
  }

  @Post(':id/materials')
  @ApiOperation({ summary: 'Add material to supplier' })
  @ApiResponse({ status: 201, description: 'Material added successfully' })
  async addMaterial(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() createMaterialDto: CreateSupplierMaterialDto,
  ) {
    return this.suppliersService.addMaterial(
      id,
      createMaterialDto,
      user.accountId,
    );
  }
}
