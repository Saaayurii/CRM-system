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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { ProxyService } from '../../common/services/proxy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class DocumentsGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  // Documents
  @Get('documents')
  @ApiOperation({ summary: 'Get all documents' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllDocuments(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.forward('documents', {
      method: 'GET', path: '/documents',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('documents/:id')
  @ApiOperation({ summary: 'Get document by ID' })
  async findOneDocument(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('documents', {
      method: 'GET', path: `/documents/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('documents')
  @ApiOperation({ summary: 'Create document' })
  async createDocument(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('documents', {
      method: 'POST', path: '/documents',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('documents/:id')
  @ApiOperation({ summary: 'Update document' })
  async updateDocument(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('documents', {
      method: 'PUT', path: `/documents/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Delete document' })
  async removeDocument(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('documents', {
      method: 'DELETE', path: `/documents/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Document Categories
  @Get('document-categories')
  @ApiOperation({ summary: 'Get all document categories' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllDocumentCategories(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.forward('documents', {
      method: 'GET', path: '/document-categories',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('document-categories/:id')
  @ApiOperation({ summary: 'Get document category by ID' })
  async findOneDocumentCategory(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('documents', {
      method: 'GET', path: `/document-categories/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('document-categories')
  @ApiOperation({ summary: 'Create document category' })
  async createDocumentCategory(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('documents', {
      method: 'POST', path: '/document-categories',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('document-categories/:id')
  @ApiOperation({ summary: 'Update document category' })
  async updateDocumentCategory(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('documents', {
      method: 'PUT', path: `/document-categories/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('document-categories/:id')
  @ApiOperation({ summary: 'Delete document category' })
  async removeDocumentCategory(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('documents', {
      method: 'DELETE', path: `/document-categories/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Document Versions
  @Get('document-versions')
  @ApiOperation({ summary: 'Get all document versions' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllDocumentVersions(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.forward('documents', {
      method: 'GET', path: '/document-versions',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('document-versions/:id')
  @ApiOperation({ summary: 'Get document version by ID' })
  async findOneDocumentVersion(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('documents', {
      method: 'GET', path: `/document-versions/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('document-versions')
  @ApiOperation({ summary: 'Create document version' })
  async createDocumentVersion(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('documents', {
      method: 'POST', path: '/document-versions',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('document-versions/:id')
  @ApiOperation({ summary: 'Update document version' })
  async updateDocumentVersion(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('documents', {
      method: 'PUT', path: `/document-versions/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('document-versions/:id')
  @ApiOperation({ summary: 'Delete document version' })
  async removeDocumentVersion(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('documents', {
      method: 'DELETE', path: `/document-versions/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }
}
