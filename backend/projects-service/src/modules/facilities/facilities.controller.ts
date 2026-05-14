import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FacilitiesService } from './facilities.service';
import { CreateFacilityDto, UpdateFacilityDto, CreateComponentDto, UpdateComponentDto } from './dto/create-facility.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Facilities')
@ApiBearerAuth()
@Controller('facilities')
export class FacilitiesController {
  constructor(private readonly service: FacilitiesService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.findAll(page ? Number(page) : 1, limit ? Number(limit) : 50);
  }

  @Get('components')
  @ApiOperation({ summary: 'List all facility components' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAllComponents(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.findAllComponents(page ? Number(page) : 1, limit ? Number(limit) : 50);
  }

  @Get('by-object/:objectId')
  @ApiOperation({ summary: 'Get facilities for a building object' })
  findByObject(@Param('objectId', ParseIntPipe) objectId: number) {
    return this.service.findByObject(objectId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser('accountId') accountId: number) {
    return this.service.findById(id, accountId);
  }

  @Post()
  create(@Body() dto: CreateFacilityDto, @CurrentUser('accountId') accountId: number, @CurrentUser('id') userId: number) {
    return this.service.create(dto, userId);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFacilityDto, @CurrentUser('accountId') accountId: number) {
    return this.service.update(id, accountId, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('accountId') accountId: number) {
    return this.service.delete(id, accountId);
  }

  @Post('components')
  @ApiOperation({ summary: 'Create component directly (admin use, facilityId in body)' })
  createComponentDirect(@Body() dto: CreateComponentDto & { facilityId: number }, @CurrentUser('accountId') accountId: number) {
    const { facilityId, ...rest } = dto;
    return this.service.addComponent(facilityId, accountId, rest);
  }

  @Post(':id/components')
  @ApiOperation({ summary: 'Add component to facility' })
  addComponent(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateComponentDto, @CurrentUser('accountId') accountId: number) {
    return this.service.addComponent(id, accountId, dto);
  }

  @Put(':id/components/:componentId')
  @ApiOperation({ summary: 'Update facility component' })
  updateComponent(@Param('id', ParseIntPipe) id: number, @Param('componentId', ParseIntPipe) componentId: number, @Body() dto: UpdateComponentDto, @CurrentUser('accountId') accountId: number) {
    return this.service.updateComponent(id, componentId, accountId, dto);
  }

  @Delete(':id/components/:componentId')
  @ApiOperation({ summary: 'Delete facility component' })
  deleteComponent(@Param('id', ParseIntPipe) id: number, @Param('componentId', ParseIntPipe) componentId: number, @CurrentUser('accountId') accountId: number) {
    return this.service.deleteComponent(id, componentId, accountId);
  }
}
