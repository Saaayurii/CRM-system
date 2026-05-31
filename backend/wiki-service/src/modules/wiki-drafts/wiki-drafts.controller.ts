import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { WikiDraftsService } from './wiki-drafts.service';
import {
  CreateWikiDraftDto, UpdateWikiDraftDto, ReviewWikiDraftDto, AddDraftCommentDto,
} from './dto/wiki-draft.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Wiki Drafts')
@ApiBearerAuth()
@Controller('wiki-drafts')
export class WikiDraftsController {
  constructor(private readonly svc: WikiDraftsService) {}

  @Get()
  @ApiOperation({ summary: 'List drafts (admin sees all, user sees own)' })
  @ApiQuery({ name: 'status', required: false })
  list(
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('roleId') roleId: number,
    @Query('status') status?: string,
  ) {
    return this.svc.listDrafts(accountId, userId, roleId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get draft by id' })
  getOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('roleId') roleId: number,
  ) {
    return this.svc.getDraft(id, accountId, userId, roleId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new draft' })
  create(
    @Body() dto: CreateWikiDraftDto,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.svc.createDraft(accountId, userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Auto-save draft content' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWikiDraftDto,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('roleId') roleId: number,
  ) {
    return this.svc.updateDraft(id, accountId, userId, roleId, dto);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit draft for review' })
  submit(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('roleId') roleId: number,
  ) {
    return this.svc.submitForReview(id, accountId, userId, roleId);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Approve or reject pending draft (admin only)' })
  review(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewWikiDraftDto,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') reviewerId: number,
    @CurrentUser('roleId') roleId: number,
  ) {
    return this.svc.reviewDraft(id, accountId, reviewerId, roleId, dto);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add comment to a draft' })
  addComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddDraftCommentDto,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('roleId') roleId: number,
  ) {
    return this.svc.addComment(id, accountId, userId, roleId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete draft' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('roleId') roleId: number,
  ) {
    return this.svc.deleteDraft(id, accountId, userId, roleId);
  }
}
