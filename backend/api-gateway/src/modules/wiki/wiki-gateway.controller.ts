import {
  Controller,
  Get, Post, Put, Delete,
  Body, Param, Query, Req, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { ProxyService } from '../../common/services/proxy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AnyRole } from '../../common/decorators/roles.decorator';

@ApiTags('Wiki')
@ApiBearerAuth()
@AnyRole()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class WikiGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  // ─── Wiki Pages ───────────────────────────────────────────────────────────

  @Get('wiki-pages/tree')
  @ApiOperation({ summary: 'Get wiki page tree (flat list for hierarchy)' })
  async getWikiTree(@Req() req: Request) {
    return this.proxyService.forward('wiki', {
      method: 'GET',
      path: '/wiki-pages/tree',
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Get('wiki-pages')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'q', required: false })
  async findAllWikiPages(@Req() req: Request, @Query() query: any) {
    return this.proxyService.forward('wiki', {
      method: 'GET',
      path: '/wiki-pages',
      headers: { authorization: req.headers.authorization || '' },
      params: query,
    });
  }

  @Get('wiki-pages/:id/versions')
  @ApiOperation({ summary: 'Get version history for a wiki page' })
  async getWikiVersions(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('wiki', {
      method: 'GET',
      path: `/wiki-pages/${id}/versions`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Get('wiki-pages/:id/versions/:versionNum')
  @ApiOperation({ summary: 'Get a specific version snapshot' })
  async getWikiVersion(@Req() req: Request, @Param('id') id: string, @Param('versionNum') versionNum: string) {
    return this.proxyService.forward('wiki', {
      method: 'GET',
      path: `/wiki-pages/${id}/versions/${versionNum}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Get('wiki-pages/:id')
  async findOneWikiPage(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('wiki', {
      method: 'GET',
      path: `/wiki-pages/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('wiki-pages')
  async createWikiPage(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('wiki', {
      method: 'POST',
      path: '/wiki-pages',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('wiki-pages/:id')
  async updateWikiPage(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('wiki', {
      method: 'PUT',
      path: `/wiki-pages/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('wiki-pages/:id')
  async removeWikiPage(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('wiki', {
      method: 'DELETE',
      path: `/wiki-pages/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // ─── Wiki Drafts ─────────────────────────────────────────────────────────

  @Get('wiki-drafts')
  @ApiQuery({ name: 'status', required: false })
  async listDrafts(@Req() req: Request, @Query('status') status?: string) {
    return this.proxyService.forward('wiki', {
      method: 'GET',
      path: '/wiki-drafts',
      headers: { authorization: req.headers.authorization || '' },
      params: status ? { status } : {},
    });
  }

  @Get('wiki-drafts/:id')
  async getDraft(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('wiki', {
      method: 'GET',
      path: `/wiki-drafts/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('wiki-drafts')
  async createDraft(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('wiki', {
      method: 'POST',
      path: '/wiki-drafts',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('wiki-drafts/:id')
  async updateDraft(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('wiki', {
      method: 'PUT',
      path: `/wiki-drafts/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Post('wiki-drafts/:id/submit')
  async submitDraft(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('wiki', {
      method: 'POST',
      path: `/wiki-drafts/${id}/submit`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('wiki-drafts/:id/review')
  async reviewDraft(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('wiki', {
      method: 'POST',
      path: `/wiki-drafts/${id}/review`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Post('wiki-drafts/:id/comments')
  async addDraftComment(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('wiki', {
      method: 'POST',
      path: `/wiki-drafts/${id}/comments`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('wiki-drafts/:id')
  async removeDraft(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('wiki', {
      method: 'DELETE',
      path: `/wiki-drafts/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }
}
