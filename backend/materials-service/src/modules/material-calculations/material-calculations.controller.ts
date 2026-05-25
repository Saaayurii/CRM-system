import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MaterialCalculationsService } from './material-calculations.service';
import {
  CreateMaterialCalculationDto,
  UpdateMaterialCalculationDto,
} from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface RequestUser {
  id: number;
  email: string;
  roleId: number;
  accountId: number;
}

@ApiTags('Material Calculations')
@ApiBearerAuth()
@Controller('material-calculations')
export class MaterialCalculationsController {
  constructor(private readonly service: MaterialCalculationsService) {}

  @Get()
  @ApiOperation({ summary: 'List saved material calculations' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'projectId', required: false, type: Number })
  @ApiQuery({ name: 'calculatorType', required: false, type: String })
  @ApiResponse({ status: 200 })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('projectId') projectId?: number,
    @Query('calculatorType') calculatorType?: string,
  ) {
    return this.service.findAll(user.accountId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      projectId: projectId !== undefined ? Number(projectId) : undefined,
      calculatorType,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get calculation by ID' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.findById(id, user.accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Save a new calculation' })
  @ApiResponse({ status: 201 })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateMaterialCalculationDto,
  ) {
    return this.service.create(dto, user.accountId, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a calculation' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMaterialCalculationDto,
  ) {
    return this.service.update(id, dto, user.accountId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a calculation' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404 })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.service.remove(id, user.accountId);
  }
}
