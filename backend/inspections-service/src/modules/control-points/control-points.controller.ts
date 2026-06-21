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
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ControlPointsService } from './control-points.service';
import { CreateControlPointDto, UpdateControlPointDto } from './dto/control-point.dto';

interface RequestUser {
  id: number;
  email: string;
  roleId: number;
  accountId: number;
}

@ApiTags('Control Points')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('control-points')
export class ControlPointsController {
  constructor(private readonly service: ControlPointsService) {}

  @Get()
  @ApiOperation({ summary: 'List control points' })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('section') section?: string,
    @Query('q') q?: string,
  ) {
    return this.service.findAll(
      user,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
      section,
      q,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get control point by ID' })
  async findById(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.findById(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Create control point' })
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateControlPointDto) {
    return this.service.create(user.accountId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update control point' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateControlPointDto,
  ) {
    return this.service.update(id, user.accountId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete control point' })
  async delete(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.delete(id, user.accountId);
  }
}
