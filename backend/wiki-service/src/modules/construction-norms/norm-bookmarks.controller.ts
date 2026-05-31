import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NormBookmarksService } from './norm-bookmarks.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Construction Norms — Bookmarks')
@ApiBearerAuth()
@Controller('norm-bookmarks')
export class NormBookmarksController {
  constructor(private readonly service: NormBookmarksService) {}

  @Get()
  @ApiOperation({ summary: 'List my bookmarked norm documents' })
  list(@CurrentUser('id') userId: number) {
    return this.service.list(userId);
  }

  @Post(':documentId')
  @ApiOperation({ summary: 'Bookmark a norm document' })
  add(
    @CurrentUser('id') userId: number,
    @Param('documentId', ParseIntPipe) documentId: number,
  ) {
    return this.service.add(userId, documentId);
  }

  @Delete(':documentId')
  @ApiOperation({ summary: 'Remove a bookmark' })
  remove(
    @CurrentUser('id') userId: number,
    @Param('documentId', ParseIntPipe) documentId: number,
  ) {
    return this.service.remove(userId, documentId);
  }
}
