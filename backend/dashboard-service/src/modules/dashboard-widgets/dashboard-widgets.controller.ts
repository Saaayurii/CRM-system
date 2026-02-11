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
import { DashboardWidgetsService } from './dashboard-widgets.service';
import { CreateDashboardWidgetDto } from './dto/create-dashboard-widget.dto';
import { UpdateDashboardWidgetDto } from './dto/update-dashboard-widget.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Dashboard Widgets')
@ApiBearerAuth()
@Controller('dashboard-widgets')
export class DashboardWidgetsController {
  constructor(private readonly svc: DashboardWidgetsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all dashboard widgets' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @CurrentUser('id') userId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.svc.findAll(userId, +page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dashboard widget by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.svc.findById(id, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create dashboard widget' })
  create(
    @Body() dto: CreateDashboardWidgetDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.svc.create(userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update dashboard widget' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDashboardWidgetDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.svc.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete dashboard widget' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.svc.delete(id, userId);
  }
}
