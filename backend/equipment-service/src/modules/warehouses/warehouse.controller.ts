import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WarehouseService } from './warehouse.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto';

interface RequestUser {
  id: number;
  accountId: number;
}

@ApiTags('Warehouses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('warehouses')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Get()
  @ApiOperation({ summary: 'Get all warehouses with their equipment' })
  async findAll(@CurrentUser() user: RequestUser) {
    return this.warehouseService.findAll(user.accountId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get warehouse by ID' })
  async findById(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.warehouseService.findById(id, user.accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create warehouse' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateWarehouseDto,
  ) {
    return this.warehouseService.create(user.accountId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update warehouse' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWarehouseDto,
  ) {
    return this.warehouseService.update(id, user.accountId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete warehouse' })
  async delete(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.warehouseService.delete(id, user.accountId);
  }
}
