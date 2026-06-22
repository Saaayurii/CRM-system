import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DealStagesService } from './deal-stages.service';
import { CreateDealStageDto, UpdateDealStageDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Deal Stages')
@ApiBearerAuth()
@Controller('deal-stages')
export class DealStagesController {
  constructor(private readonly svc: DealStagesService) {}

  @Get()
  @ApiOperation({ summary: 'List pipeline stages (seeds defaults if empty)' })
  findAll(@CurrentUser('accountId') accountId: number) {
    return this.svc.findAll(accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create stage' })
  create(
    @Body() dto: CreateDealStageDto,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.svc.create(accountId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update stage' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDealStageDto,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.svc.update(id, accountId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete stage (must be empty)' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.svc.delete(id, accountId);
  }
}
