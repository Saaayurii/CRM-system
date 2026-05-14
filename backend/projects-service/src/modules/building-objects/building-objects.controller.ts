import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BuildingObjectsService } from './building-objects.service';
import { CreateBuildingObjectDto } from './dto/create-building-object.dto';
import { UpdateBuildingObjectDto } from './dto/update-building-object.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('BuildingObjects')
@ApiBearerAuth()
@Controller('objects')
export class BuildingObjectsController {
  constructor(private readonly service: BuildingObjectsService) {}

  @Get()
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'constructionSiteId', required: false })
  @ApiQuery({ name: 'parentId', required: false })
  @ApiQuery({ name: 'objectType', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @CurrentUser('accountId') accountId: number,
    @Query('projectId') projectId?: string,
    @Query('constructionSiteId') constructionSiteId?: string,
    @Query('parentId') parentId?: string,
    @Query('objectType') objectType?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(accountId, {
      projectId: projectId ? Number(projectId) : undefined,
      constructionSiteId: constructionSiteId ? Number(constructionSiteId) : undefined,
      parentId: parentId === 'null' ? null : parentId ? Number(parentId) : undefined,
      objectType,
      status,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 100,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser('accountId') accountId: number) {
    return this.service.findById(id, accountId);
  }

  @Post()
  create(@Body() dto: CreateBuildingObjectDto, @CurrentUser('accountId') accountId: number, @CurrentUser('id') userId: number) {
    return this.service.create(accountId, dto, userId);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBuildingObjectDto, @CurrentUser('accountId') accountId: number) {
    return this.service.update(id, accountId, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('accountId') accountId: number) {
    return this.service.delete(id, accountId);
  }
}
