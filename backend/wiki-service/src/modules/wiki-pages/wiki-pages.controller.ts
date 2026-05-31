import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WikiPagesService } from './wiki-pages.service';
import { CreateWikiPageDto } from './dto/create-wiki-page.dto';
import { UpdateWikiPageDto } from './dto/update-wiki-page.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WikiDraftsService } from '../wiki-drafts/wiki-drafts.service';

@ApiTags('Wiki Pages')
@ApiBearerAuth()
@Controller('wiki-pages')
export class WikiPagesController {
  constructor(
    private readonly wikiPagesService: WikiPagesService,
    private readonly wikiDraftsService: WikiDraftsService,
  ) {}

  @Get()
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'q', required: false })
  findAll(
    @CurrentUser('accountId') accountId: number,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('category') category?: string,
    @Query('q') q?: string,
  ) {
    return this.wikiPagesService.findAll(accountId, +page, +limit, category, q);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Flat list for building hierarchical tree on client' })
  getTree(@CurrentUser('accountId') accountId: number) {
    return this.wikiPagesService.findTree(accountId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    this.wikiPagesService.incrementView(id, accountId).catch(() => {});
    return this.wikiPagesService.findById(id, accountId);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get version history for a page' })
  getVersions(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.wikiPagesService.getVersions(id, accountId);
  }

  @Get(':id/versions/:versionNum')
  @ApiOperation({ summary: 'Get a specific version snapshot' })
  getVersion(
    @Param('id', ParseIntPipe) id: number,
    @Param('versionNum', ParseIntPipe) versionNum: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.wikiPagesService.getVersion(id, versionNum, accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create wiki page (admin direct publish)' })
  create(
    @Body() dto: CreateWikiPageDto,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('roleId') roleId: number,
  ) {
    return this.wikiDraftsService.publishPageDirect(null, accountId, userId, roleId, dto as any);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update wiki page (admin direct publish, creates version snapshot)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWikiPageDto,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('roleId') roleId: number,
  ) {
    return this.wikiDraftsService.publishPageDirect(id, accountId, userId, roleId, dto as any);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.wikiPagesService.delete(id, accountId);
  }
}
