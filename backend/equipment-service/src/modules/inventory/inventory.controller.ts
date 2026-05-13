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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InventoryService } from './inventory.service';
import { CreateInventorySessionDto, UpdateInventorySessionDto, CreateInventoryItemDto } from './dto';

interface RequestUser {
  id: number;
  accountId: number;
}

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory-sessions')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get all inventory sessions' })
  @ApiQuery({ name: 'projectId', required: false, type: Number })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query('projectId') projectId?: string,
  ) {
    return this.inventoryService.findAll(
      user.accountId,
      projectId !== undefined ? parseInt(projectId, 10) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory session by ID' })
  async findById(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.inventoryService.findById(id, user.accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create inventory session' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateInventorySessionDto,
  ) {
    return this.inventoryService.create(user.accountId, user.id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update inventory session' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInventorySessionDto,
  ) {
    return this.inventoryService.update(id, user.accountId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete inventory session' })
  async delete(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.inventoryService.delete(id, user.accountId);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add item to inventory session' })
  async addItem(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateInventoryItemDto,
  ) {
    return this.inventoryService.addItem(id, user.accountId, dto);
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: 'Remove item from inventory session' })
  async deleteItem(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.inventoryService.deleteItem(id, itemId, user.accountId);
  }
}
