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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { BonusesService } from './bonuses.service';
import { CreateBonusDto } from './dto/create-bonus.dto';
import { UpdateBonusDto } from './dto/update-bonus.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Bonuses')
@ApiBearerAuth()
@Controller('bonuses')
export class BonusesController {
  constructor(private readonly bonusesService: BonusesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all bonuses' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'projectId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: Number })
  findAll(
    @CurrentUser('accountId') accountId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('userId') userId?: number,
    @Query('projectId') projectId?: number,
    @Query('status') status?: number,
  ) {
    const filters: any = {};
    if (userId) filters.userId = +userId;
    if (projectId) filters.projectId = +projectId;
    if (status !== undefined && status !== null) filters.status = +status;
    return this.bonusesService.findAll(accountId, +page, +limit, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bonus by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.bonusesService.findById(id, accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create bonus' })
  create(
    @Body() dto: CreateBonusDto,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.bonusesService.create(accountId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update bonus' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBonusDto,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.bonusesService.update(id, accountId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete bonus' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.bonusesService.delete(id, accountId);
  }
}
