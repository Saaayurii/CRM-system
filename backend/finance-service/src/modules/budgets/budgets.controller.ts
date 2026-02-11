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
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { CreateBudgetItemDto } from './dto/create-budget-item.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Budgets')
@ApiBearerAuth()
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all budgets' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser('accountId') accountId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.budgetsService.findAll(accountId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get budget by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.budgetsService.findById(id, accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create budget' })
  create(
    @Body() dto: CreateBudgetDto,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.budgetsService.create(accountId, dto, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update budget' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBudgetDto,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.budgetsService.update(id, accountId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete budget' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.budgetsService.delete(id, accountId);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add item to budget' })
  createItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateBudgetItemDto,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.budgetsService.createItem(id, accountId, dto);
  }
}
