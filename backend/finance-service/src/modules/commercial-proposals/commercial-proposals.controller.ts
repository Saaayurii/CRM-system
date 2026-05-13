import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CommercialProposalsService } from './commercial-proposals.service';
import { CreateProposalDto, CreateProposalLineDto } from './dto/create-proposal.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('CommercialProposals')
@ApiBearerAuth()
@Controller('commercial-proposals')
export class CommercialProposalsController {
  constructor(private readonly service: CommercialProposalsService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @CurrentUser('accountId') accountId: number,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('projectId') projectId?: number,
    @Query('status') status?: string,
  ) {
    return this.service.findAll(accountId, Number(page), Number(limit), projectId ? Number(projectId) : undefined, status);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.service.findById(id, accountId);
  }

  @Post()
  create(
    @Body() dto: CreateProposalDto,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.service.create(accountId, dto, userId);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProposalDto,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.service.update(id, accountId, dto);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.service.delete(id, accountId);
  }

  @Post(':id/lines')
  @ApiOperation({ summary: 'Add line to proposal' })
  addLine(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateProposalLineDto,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.service.addLine(id, accountId, dto);
  }

  @Delete('lines/:lineId')
  @ApiOperation({ summary: 'Delete proposal line' })
  deleteLine(
    @Param('lineId', ParseIntPipe) lineId: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.service.deleteLine(lineId, accountId);
  }
}
