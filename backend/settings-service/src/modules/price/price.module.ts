import { Module } from '@nestjs/common';
import { PriceService } from './price.service';
import { PriceExportService } from './price-export.service';
import { PriceImportService } from './price-import.service';
import { PriceParametersService } from './price-parameters.service';
import { PriceCalcService } from './price-calc.service';
import { PriceProjectCategoriesController } from './price-project-categories.controller';
import { PriceCategoriesController } from './price-categories.controller';
import { PriceItemsController } from './price-items.controller';
import { PriceListController } from './price-list.controller';
import { PriceParametersController } from './price-parameters.controller';
import { PriceUnitsController } from './price-units.controller';

@Module({
  controllers: [
    PriceProjectCategoriesController,
    PriceCategoriesController,
    PriceItemsController,
    PriceListController,
    PriceParametersController,
    PriceUnitsController,
  ],
  providers: [
    PriceService,
    PriceExportService,
    PriceImportService,
    PriceParametersService,
    PriceCalcService,
  ],
})
export class PriceModule {}
