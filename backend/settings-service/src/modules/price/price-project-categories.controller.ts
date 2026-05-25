import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PriceService } from './price.service';
import {
  CreatePriceProjectCategoryDto,
  UpdatePriceProjectCategoryDto,
} from './dto/upsert-price-project-category.dto';

@ApiTags('Price — Project Categories')
@ApiBearerAuth()
@Controller('price-project-categories')
export class PriceProjectCategoriesController {
  constructor(private readonly svc: PriceService) {}

  @Get()
  @ApiOperation({ summary: 'List project categories (price columns)' })
  list(@CurrentUser('accountId') accountId: number) {
    return this.svc.listProjectCategories(accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create project category' })
  create(
    @CurrentUser('accountId') accountId: number,
    @Body() dto: CreatePriceProjectCategoryDto,
  ) {
    return this.svc.createProjectCategory(accountId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update project category' })
  update(
    @CurrentUser('accountId') accountId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePriceProjectCategoryDto,
  ) {
    return this.svc.updateProjectCategory(accountId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete project category' })
  remove(
    @CurrentUser('accountId') accountId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.svc.removeProjectCategory(accountId, id);
  }
}
