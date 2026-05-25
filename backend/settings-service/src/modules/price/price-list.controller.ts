import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PriceService } from './price.service';

@ApiTags('Price — Aggregate')
@ApiBearerAuth()
@Controller('price-list')
export class PriceListController {
  constructor(private readonly svc: PriceService) {}

  @Get()
  @ApiOperation({
    summary: 'Get full price list: project categories, categories, items with prices and modifiers',
  })
  get(@CurrentUser('accountId') accountId: number) {
    return this.svc.getPriceList(accountId);
  }
}
