import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CalendarFeedService } from './calendar-feed.service';
import { FeedQueryDto } from './dto/feed-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { Request } from 'express';

@ApiTags('Calendar / Feed')
@ApiBearerAuth()
@Controller('calendar-feed')
export class CalendarFeedController {
  constructor(private readonly service: CalendarFeedService) {}

  @Get()
  @ApiOperation({
    summary: 'Унифицированная лента событий из всех источников системы',
  })
  feed(
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('userId') userId: number,
    @Query() q: FeedQueryDto,
    @Req() req: Request,
  ) {
    return this.service.getFeed(
      accountId,
      userId,
      {
        start: q.start,
        end: q.end,
        sources: q.sources,
        projectId: q.projectId,
        mine: q.mine === '1' || q.mine === 'true',
      },
      req.headers.authorization,
    );
  }
}
