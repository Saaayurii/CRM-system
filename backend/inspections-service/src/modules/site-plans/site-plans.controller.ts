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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SitePlansService } from './site-plans.service';
import { CreateSitePlanDto, UpdateSitePlanDto } from './dto';

interface RequestUser {
  id: number;
  email: string;
  roleId: number;
  accountId: number;
}

@ApiTags('Site Plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('site-plans')
export class SitePlansController {
  constructor(private readonly svc: SitePlansService) {}

  @Get()
  @ApiOperation({ summary: 'List site plans (drawings)' })
  @ApiQuery({ name: 'projectId', required: false, type: Number })
  @ApiQuery({ name: 'constructionSiteId', required: false, type: Number })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('projectId') projectId?: string,
    @Query('constructionSiteId') constructionSiteId?: string,
  ) {
    return this.svc.findAll(
      user.accountId,
      projectId !== undefined ? parseInt(projectId, 10) : undefined,
      constructionSiteId !== undefined
        ? parseInt(constructionSiteId, 10)
        : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get plan with its pinned defects' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.svc.findById(id, user.accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create site plan' })
  create(@Body() dto: CreateSitePlanDto, @CurrentUser() user: RequestUser) {
    return this.svc.create(user.accountId, dto, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update site plan' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSitePlanDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.svc.update(id, user.accountId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete site plan (soft)' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.svc.delete(id, user.accountId);
  }
}
