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
import { MaterialRequestsService } from './material-requests.service';
import {
  CreateMaterialRequestDto,
  UpdateMaterialRequestDto,
  CreateMaterialRequestItemDto,
} from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface RequestUser {
  id: number;
  email: string;
  roleId: number;
  accountId: number;
}

@ApiTags('Material Requests')
@ApiBearerAuth()
@Controller('material-requests')
export class MaterialRequestsController {
  constructor(private readonly materialRequestsService: MaterialRequestsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all material requests' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Material requests retrieved successfully' })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: number,
  ) {
    return this.materialRequestsService.findAll(user.accountId, page || 1, limit || 20, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get material request by ID' })
  @ApiResponse({ status: 200, description: 'Material request retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Material request not found' })
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.materialRequestsService.findById(id, user.accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new material request' })
  @ApiResponse({ status: 201, description: 'Material request created successfully' })
  @ApiResponse({ status: 409, description: 'Material request with this number already exists' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() createDto: CreateMaterialRequestDto,
  ) {
    return this.materialRequestsService.create(createDto, user.accountId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update material request' })
  @ApiResponse({ status: 200, description: 'Material request updated successfully' })
  @ApiResponse({ status: 404, description: 'Material request not found' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateMaterialRequestDto,
  ) {
    return this.materialRequestsService.update(id, updateDto, user.accountId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete material request' })
  @ApiResponse({ status: 204, description: 'Material request deleted successfully' })
  @ApiResponse({ status: 404, description: 'Material request not found' })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.materialRequestsService.remove(id, user.accountId);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add item to material request' })
  @ApiResponse({ status: 201, description: 'Item added successfully' })
  @ApiResponse({ status: 404, description: 'Material request not found' })
  async addItem(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() createItemDto: CreateMaterialRequestItemDto,
  ) {
    return this.materialRequestsService.addItem(id, createItemDto, user.accountId);
  }
}
