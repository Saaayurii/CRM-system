import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PriceService } from './price.service';
import { CreatePriceUnitDto, UpdatePriceUnitDto } from './dto/upsert-price-unit.dto';

@ApiTags('Price — Units')
@ApiBearerAuth()
@Controller('price-units')
export class PriceUnitsController {
  constructor(private readonly svc: PriceService) {}

  @Get()
  @ApiOperation({ summary: 'List units of measure' })
  list(@CurrentUser('accountId') accountId: number) {
    return this.svc.listUnits(accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create unit' })
  create(
    @CurrentUser('accountId') accountId: number,
    @Body() dto: CreatePriceUnitDto,
  ) {
    return this.svc.createUnit(accountId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update unit' })
  update(
    @CurrentUser('accountId') accountId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePriceUnitDto,
  ) {
    return this.svc.updateUnit(accountId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete unit' })
  remove(
    @CurrentUser('accountId') accountId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.svc.removeUnit(accountId, id);
  }
}
