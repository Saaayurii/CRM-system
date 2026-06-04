import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PriceService } from './price.service';
import { PriceCalcService } from './price-calc.service';
import {
  CreatePriceItemDto,
  UpdatePriceItemDto,
} from './dto/upsert-price-item.dto';
import { CalcPriceDto } from './dto/calc-price.dto';

@ApiTags('Price — Items')
@ApiBearerAuth()
@Controller('price-items')
export class PriceItemsController {
  constructor(
    private readonly svc: PriceService,
    private readonly calc: PriceCalcService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List price items (with prices and modifiers)' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'rootOnly', required: false })
  list(
    @CurrentUser('accountId') accountId: number,
    @Query('categoryId') categoryId?: string,
    @Query('rootOnly', new ParseBoolPipe({ optional: true })) rootOnly?: boolean,
  ) {
    return this.svc.listItems(accountId, {
      categoryId: categoryId ? Number(categoryId) : undefined,
      rootOnly: rootOnly ?? false,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single price item' })
  get(
    @CurrentUser('accountId') accountId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.svc.getItem(accountId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create price item' })
  create(
    @CurrentUser('accountId') accountId: number,
    @Body() dto: CreatePriceItemDto,
  ) {
    return this.svc.createItem(accountId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update price item' })
  update(
    @CurrentUser('accountId') accountId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePriceItemDto,
  ) {
    return this.svc.updateItem(accountId, id, dto);
  }

  @Post(':id/calc')
  @ApiOperation({ summary: 'Calculate price for selected parameter options' })
  calcPrice(
    @CurrentUser('accountId') accountId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CalcPriceDto,
  ) {
    return this.calc.calc(accountId, id, dto.selections ?? []);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete price item' })
  remove(
    @CurrentUser('accountId') accountId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.svc.removeItem(accountId, id);
  }
}
