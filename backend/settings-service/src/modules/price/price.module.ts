import { Module } from '@nestjs/common';
import { PriceService } from './price.service';
import { PriceProjectCategoriesController } from './price-project-categories.controller';
import { PriceCategoriesController } from './price-categories.controller';
import { PriceItemsController } from './price-items.controller';
import { PriceListController } from './price-list.controller';

@Module({
  controllers: [
    PriceProjectCategoriesController,
    PriceCategoriesController,
    PriceItemsController,
    PriceListController,
  ],
  providers: [PriceService],
})
export class PriceModule {}
