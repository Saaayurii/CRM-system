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
import {
  CreatePriceItemDto,
  UpdatePriceItemDto,
} from './dto/upsert-price-item.dto';

@ApiTags('Price — Items')
@ApiBearerAuth()
@Controller('price-items')
export class PriceItemsController {
  constructor(private readonly svc: PriceService) {}

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

  @Delete(':id')
  @ApiOperation({ summary: 'Delete price item' })
  remove(
    @CurrentUser('accountId') accountId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.svc.removeItem(accountId, id);
  }
}
