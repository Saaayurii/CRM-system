import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { EstimatesService } from './estimates.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateEstimateDto,
  UpdateEstimateDto,
  UpsertSectionDto,
  UpsertItemDto,
} from './dto/upsert-estimate.dto';

@ApiTags('Estimates')
@ApiBearerAuth()
@Controller('estimates')
export class EstimatesController {
  constructor(private readonly svc: EstimatesService) {}

  @Get()
  @ApiOperation({ summary: 'List estimates' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'contractId', required: false })
  list(
    @CurrentUser('accountId') accountId: number,
    @Query('projectId') projectId?: string,
    @Query('contractId') contractId?: string,
  ) {
    return this.svc.list(accountId, {
      projectId: projectId ? Number(projectId) : undefined,
      contractId: contractId ? Number(contractId) : undefined,
    });
  }

  @Get(':id')
  get(@CurrentUser('accountId') accountId: number, @Param('id', ParseIntPipe) id: number) {
    return this.svc.get(accountId, id);
  }

  @Post()
  create(@CurrentUser('accountId') accountId: number, @Body() dto: CreateEstimateDto) {
    return this.svc.create(accountId, dto);
  }

  @Put(':id')
  update(
    @CurrentUser('accountId') accountId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEstimateDto,
  ) {
    return this.svc.update(accountId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('accountId') accountId: number, @Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(accountId, id);
  }

  /* sections */

  @Post(':id/sections')
  addSection(
    @CurrentUser('accountId') accountId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertSectionDto,
  ) {
    return this.svc.addSection(accountId, id, dto);
  }

  @Put(':id/sections/:sectionId')
  updateSection(
    @CurrentUser('accountId') accountId: number,
    @Param('id', ParseIntPipe) id: number,
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @Body() dto: UpsertSectionDto,
  ) {
    return this.svc.updateSection(accountId, id, sectionId, dto);
  }

  @Delete(':id/sections/:sectionId')
  deleteSection(
    @CurrentUser('accountId') accountId: number,
    @Param('id', ParseIntPipe) id: number,
    @Param('sectionId', ParseIntPipe) sectionId: number,
  ) {
    return this.svc.deleteSection(accountId, id, sectionId);
  }

  /* items */

  @Post(':id/sections/:sectionId/items')
  addItem(
    @CurrentUser('accountId') accountId: number,
    @Param('id', ParseIntPipe) id: number,
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @Body() dto: UpsertItemDto,
  ) {
    return this.svc.addItem(accountId, id, sectionId, dto);
  }

  @Put(':id/sections/:sectionId/items/:itemId')
  updateItem(
    @CurrentUser('accountId') accountId: number,
    @Param('id', ParseIntPipe) id: number,
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpsertItemDto,
  ) {
    return this.svc.updateItem(accountId, id, sectionId, itemId, dto);
  }

  @Delete(':id/sections/:sectionId/items/:itemId')
  deleteItem(
    @CurrentUser('accountId') accountId: number,
    @Param('id', ParseIntPipe) id: number,
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.svc.deleteItem(accountId, id, sectionId, itemId);
  }
}
