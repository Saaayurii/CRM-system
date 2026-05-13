import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WorkTemplatesService } from './work-templates.service';
import { CreateWorkTemplateDto } from './dto/create-work-template.dto';
import { UpdateWorkTemplateDto } from './dto/update-work-template.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('WorkTemplates')
@ApiBearerAuth()
@Controller('work-templates')
export class WorkTemplatesController {
  constructor(private readonly service: WorkTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List price items (work templates)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  findAll(
    @CurrentUser('accountId') accountId: number,
    @Query('page') page = 1,
    @Query('limit') limit = 100,
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.service.findAll(accountId, Number(page), Number(limit), search, category);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List distinct categories' })
  categories(@CurrentUser('accountId') accountId: number) {
    return this.service.categories(accountId);
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
    @Body() dto: CreateWorkTemplateDto,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.service.create(accountId, dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkTemplateDto,
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
}
