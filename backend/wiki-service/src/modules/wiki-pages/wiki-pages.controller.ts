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
import { WikiPagesService } from './wiki-pages.service';
import { CreateWikiPageDto } from './dto/create-wiki-page.dto';
import { UpdateWikiPageDto } from './dto/update-wiki-page.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Wiki Pages')
@ApiBearerAuth()
@Controller('wiki-pages')
export class WikiPagesController {
  constructor(private readonly wikiPagesService: WikiPagesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all wiki pages' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'category', required: false })
  findAll(
    @CurrentUser('accountId') accountId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('category') category?: string,
  ) {
    return this.wikiPagesService.findAll(accountId, +page, +limit, category);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get wiki page by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.wikiPagesService.findById(id, accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create wiki page' })
  create(
    @Body() dto: CreateWikiPageDto,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.wikiPagesService.create(accountId, userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update wiki page' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWikiPageDto,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.wikiPagesService.update(id, accountId, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete wiki page' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.wikiPagesService.delete(id, accountId);
  }
}
