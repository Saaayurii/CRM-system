import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PriceParametersService } from './price-parameters.service';
import {
  CreatePriceParameterDto,
  UpdatePriceParameterDto,
} from './dto/upsert-price-parameter.dto';

@ApiTags('Price — Parameters (library)')
@ApiBearerAuth()
@Controller('price-parameters')
export class PriceParametersController {
  constructor(private readonly svc: PriceParametersService) {}

  @Get()
  @ApiOperation({ summary: 'List parameter library (with values)' })
  list(@CurrentUser('accountId') accountId: number) {
    return this.svc.list(accountId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get parameter with values' })
  get(
    @CurrentUser('accountId') accountId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.svc.get(accountId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create parameter (with values)' })
  create(
    @CurrentUser('accountId') accountId: number,
    @Body() dto: CreatePriceParameterDto,
  ) {
    return this.svc.create(accountId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update parameter (values fully replaced if provided)' })
  update(
    @CurrentUser('accountId') accountId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePriceParameterDto,
  ) {
    return this.svc.update(accountId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete parameter' })
  remove(
    @CurrentUser('accountId') accountId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.svc.remove(accountId, id);
  }
}
