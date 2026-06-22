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
import { DealsService } from './deals.service';
import { CreateDealDto, UpdateDealDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Deals')
@ApiBearerAuth()
@Controller('deals')
export class DealsController {
  constructor(private readonly svc: DealsService) {}

  @Get()
  @ApiOperation({ summary: 'List deals' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'managerId', required: false })
  @ApiQuery({ name: 'clientId', required: false })
  findAll(
    @CurrentUser('accountId') accountId: number,
    @Query('status') status?: string,
    @Query('managerId') managerId?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.svc.findAll(
      accountId,
      status,
      managerId ? +managerId : undefined,
      clientId ? +clientId : undefined,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Open deals count & sum per stage' })
  stats(@CurrentUser('accountId') accountId: number) {
    return this.svc.stats(accountId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deal by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.svc.findById(id, accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create deal' })
  create(
    @Body() dto: CreateDealDto,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.svc.create(accountId, dto, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update deal (incl. stage move)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDealDto,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.svc.update(id, accountId, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete deal' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.svc.delete(id, accountId);
  }
}
