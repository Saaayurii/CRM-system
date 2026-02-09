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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ActsService } from './acts.service';
import { CreateActDto } from './dto/create-act.dto';
import { UpdateActDto } from './dto/update-act.dto';
import { CreateActItemDto } from './dto/create-act-item.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Acts')
@ApiBearerAuth()
@Controller('acts')
export class ActsController {
  constructor(private readonly actsService: ActsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all acts' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser('accountId') accountId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.actsService.findAll(accountId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get act by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.actsService.findById(id, accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create act' })
  create(
    @Body() dto: CreateActDto,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.actsService.create(accountId, dto, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update act' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateActDto,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.actsService.update(id, accountId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete act' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.actsService.delete(id, accountId);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add item to act' })
  createItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateActItemDto,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.actsService.createItem(id, accountId, dto);
  }
}
