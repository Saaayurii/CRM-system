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
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto, UpdateEquipmentDto } from './dto';

interface RequestUser {
  id: number;
  email: string;
  roleId: number;
  accountId: number;
}

@ApiTags('Equipment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get()
  @ApiOperation({ summary: 'Get all equipment with pagination' })
  @ApiResponse({ status: 200, description: 'List of equipment' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: Number })
  @ApiQuery({ name: 'siteId', required: false, type: Number })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('siteId') siteId?: string,
  ) {
    return this.equipmentService.findAll(
      user.accountId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status !== undefined ? parseInt(status, 10) : undefined,
      siteId !== undefined ? parseInt(siteId, 10) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get equipment by ID' })
  @ApiResponse({ status: 200, description: 'Equipment details' })
  @ApiResponse({ status: 404, description: 'Equipment not found' })
  async findById(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.equipmentService.findById(id, user.accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new equipment' })
  @ApiResponse({ status: 201, description: 'Equipment created' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateEquipmentDto,
  ) {
    return this.equipmentService.create(user.accountId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update equipment' })
  @ApiResponse({ status: 200, description: 'Equipment updated' })
  @ApiResponse({ status: 404, description: 'Equipment not found' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEquipmentDto,
  ) {
    return this.equipmentService.update(id, user.accountId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete equipment' })
  @ApiResponse({ status: 200, description: 'Equipment deleted' })
  @ApiResponse({ status: 404, description: 'Equipment not found' })
  async delete(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.equipmentService.delete(id, user.accountId);
  }
}
