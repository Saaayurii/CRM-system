import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PriceService } from './price.service';
import {
  CreatePriceCategoryDto,
  UpdatePriceCategoryDto,
} from './dto/upsert-price-category.dto';

@ApiTags('Price — Categories')
@ApiBearerAuth()
@Controller('price-categories')
export class PriceCategoriesController {
  constructor(private readonly svc: PriceService) {}

  @Get()
  @ApiOperation({ summary: 'List price categories' })
  list(@CurrentUser('accountId') accountId: number) {
    return this.svc.listCategories(accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create price category' })
  create(
    @CurrentUser('accountId') accountId: number,
    @Body() dto: CreatePriceCategoryDto,
  ) {
    return this.svc.createCategory(accountId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update price category' })
  update(
    @CurrentUser('accountId') accountId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePriceCategoryDto,
  ) {
    return this.svc.updateCategory(accountId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete price category' })
  remove(
    @CurrentUser('accountId') accountId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.svc.removeCategory(accountId, id);
  }
}
