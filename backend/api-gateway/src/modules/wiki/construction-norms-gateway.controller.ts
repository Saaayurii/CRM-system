import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { ProxyService } from '../../common/services/proxy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

/**
 * Gateway proxy for the Construction Wiki (Строительная ВИКИ) — global
 * normative base served by wiki-service. Writes are authorized downstream
 * (super_admin only).
 */
@ApiTags('Construction Norms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class ConstructionNormsGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  private auth(req: Request) {
    return {
      authorization: req.headers.authorization || '',
      'x-account-id': (req.headers['x-account-id'] as string) || '',
    };
  }

  private jsonAuth(req: Request) {
    return { ...this.auth(req), 'content-type': 'application/json' };
  }

  // ─── Categories ───
  @Get('norm-categories')
  @ApiOperation({ summary: 'List norm categories' })
  listCategories(@Req() req: Request) {
    return this.proxyService.forward('wiki', {
      method: 'GET',
      path: '/norm-categories',
      headers: this.auth(req),
    });
  }

  @Get('norm-categories/:id')
  getCategory(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('wiki', {
      method: 'GET',
      path: `/norm-categories/${id}`,
      headers: this.auth(req),
    });
  }

  @Post('norm-categories')
  createCategory(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('wiki', {
      method: 'POST',
      path: '/norm-categories',
      headers: this.jsonAuth(req),
      data: body,
    });
  }

  @Put('norm-categories/:id')
  updateCategory(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('wiki', {
      method: 'PUT',
      path: `/norm-categories/${id}`,
      headers: this.jsonAuth(req),
      data: body,
    });
  }

  @Delete('norm-categories/:id')
  deleteCategory(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('wiki', {
      method: 'DELETE',
      path: `/norm-categories/${id}`,
      headers: this.auth(req),
    });
  }

  // ─── Documents ───
  @Get('norm-documents')
  @ApiOperation({ summary: 'List / search norm documents' })
  listDocuments(@Req() req: Request, @Query() query: Record<string, unknown>) {
    return this.proxyService.forward('wiki', {
      method: 'GET',
      path: '/norm-documents',
      headers: this.auth(req),
      params: query,
    });
  }

  @Get('norm-documents/stats')
  documentStats(@Req() req: Request) {
    return this.proxyService.forward('wiki', {
      method: 'GET',
      path: '/norm-documents/stats',
      headers: this.auth(req),
    });
  }

  @Get('norm-documents/:id')
  getDocument(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('wiki', {
      method: 'GET',
      path: `/norm-documents/${id}`,
      headers: this.auth(req),
    });
  }

  @Post('norm-documents')
  createDocument(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('wiki', {
      method: 'POST',
      path: '/norm-documents',
      headers: this.jsonAuth(req),
      data: body,
    });
  }

  @Put('norm-documents/:id')
  updateDocument(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('wiki', {
      method: 'PUT',
      path: `/norm-documents/${id}`,
      headers: this.jsonAuth(req),
      data: body,
    });
  }

  @Delete('norm-documents/:id')
  deleteDocument(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('wiki', {
      method: 'DELETE',
      path: `/norm-documents/${id}`,
      headers: this.auth(req),
    });
  }

  // ─── Bookmarks ───
  @Get('norm-bookmarks')
  listBookmarks(@Req() req: Request) {
    return this.proxyService.forward('wiki', {
      method: 'GET',
      path: '/norm-bookmarks',
      headers: this.auth(req),
    });
  }

  @Post('norm-bookmarks/:documentId')
  addBookmark(@Req() req: Request, @Param('documentId') documentId: string) {
    return this.proxyService.forward('wiki', {
      method: 'POST',
      path: `/norm-bookmarks/${documentId}`,
      headers: this.auth(req),
    });
  }

  @Delete('norm-bookmarks/:documentId')
  removeBookmark(@Req() req: Request, @Param('documentId') documentId: string) {
    return this.proxyService.forward('wiki', {
      method: 'DELETE',
      path: `/norm-bookmarks/${documentId}`,
      headers: this.auth(req),
    });
  }
}
