import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ShareLinksService } from './share-links.service';
import { CreateShareLinkDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('ShareLinks')
@ApiBearerAuth()
@Controller('share-links')
export class ShareLinksController {
  constructor(private readonly svc: ShareLinksService) {}

  @Get()
  @ApiOperation({ summary: 'List share links of account' })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  findAll(
    @CurrentUser('accountId') accountId: number,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.svc.findAll(
      accountId,
      entityType,
      entityId ? +entityId : undefined,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create share link' })
  create(
    @Body() dto: CreateShareLinkDto,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.svc.create(accountId, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke share link' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.svc.revoke(id, accountId);
  }

  // Публичный резолв токена — вызывается gateway без авторизации.
  @Public()
  @Get('resolve/:token')
  @ApiOperation({ summary: 'Resolve share token (public)' })
  resolve(@Param('token') token: string) {
    return this.svc.resolve(token);
  }
}
