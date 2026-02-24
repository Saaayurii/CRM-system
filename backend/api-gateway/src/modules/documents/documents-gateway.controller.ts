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
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { HttpService } from '@nestjs/axios';
import { ProxyService } from '../../common/services/proxy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class DocumentsGatewayController {
  constructor(
    private readonly proxyService: ProxyService,
    private readonly httpService: HttpService,
  ) {}

  // Documents
  @Get('documents')
  @ApiOperation({ summary: 'Get all documents' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'documentType', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAllDocuments(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('documentType') documentType?: string,
    @Query('status') status?: string,
    @Query('projectId') projectId?: number,
    @Query('search') search?: string,
  ) {
    return this.proxyService.forward('documents', {
      method: 'GET',
      path: '/documents',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit, documentType, status, projectId, search },
    });
  }

  @Get('documents/:id')
  @ApiOperation({ summary: 'Get document by ID' })
  async findOneDocument(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('documents', {
      method: 'GET',
      path: `/documents/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('documents')
  @ApiOperation({ summary: 'Create document' })
  async createDocument(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('documents', {
      method: 'POST',
      path: '/documents',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('documents/:id')
  @ApiOperation({ summary: 'Update document' })
  async updateDocument(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('documents', {
      method: 'PUT',
      path: `/documents/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Delete document' })
  async removeDocument(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('documents', {
      method: 'DELETE',
      path: `/documents/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // PDF generation
  @Post('documents/pdf/generate')
  @ApiOperation({ summary: 'Generate PDF for an entity' })
  async generatePdf(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('documents', {
      method: 'POST',
      path: '/pdf/generate',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Get('documents/pdf/download/:filename')
  @ApiOperation({ summary: 'Download a generated PDF' })
  async downloadPdf(
    @Req() req: Request,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    try {
      const serviceUrl = this.proxyService.getServiceUrl('documents');
      const response = await this.httpService.axiosRef.get(
        `${serviceUrl}/pdf/download/${filename}`,
        { responseType: 'stream' },
      );
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      });
      response.data.pipe(res);
    } catch (err: any) {
      const status = err?.response?.status ?? 500;
      res.status(status).json({ message: status === 404 ? 'Файл не найден' : 'Ошибка при скачивании' });
    }
  }

  @Post('documents/pdf/generate-list')
  @ApiOperation({ summary: 'Generate PDF for a list of entities' })
  async generateListPdf(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('documents', {
      method: 'POST',
      path: '/pdf/generate-list',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Get('documents/pdf/list')
  @ApiOperation({ summary: 'List generated PDFs' })
  async listPdfs(@Req() req: Request) {
    return this.proxyService.forward('documents', {
      method: 'GET',
      path: '/pdf/list',
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Document Categories
  @Get('document-categories')
  @ApiOperation({ summary: 'Get all document categories' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllDocumentCategories(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('documents', {
      method: 'GET',
      path: '/document-categories',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('document-categories/:id')
  @ApiOperation({ summary: 'Get document category by ID' })
  async findOneDocumentCategory(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('documents', {
      method: 'GET',
      path: `/document-categories/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('document-categories')
  @ApiOperation({ summary: 'Create document category' })
  async createDocumentCategory(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('documents', {
      method: 'POST',
      path: '/document-categories',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('document-categories/:id')
  @ApiOperation({ summary: 'Update document category' })
  async updateDocumentCategory(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('documents', {
      method: 'PUT',
      path: `/document-categories/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('document-categories/:id')
  @ApiOperation({ summary: 'Delete document category' })
  async removeDocumentCategory(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('documents', {
      method: 'DELETE',
      path: `/document-categories/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Document Versions
  @Get('document-versions')
  @ApiOperation({ summary: 'Get all document versions' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllDocumentVersions(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('documents', {
      method: 'GET',
      path: '/document-versions',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('document-versions/:id')
  @ApiOperation({ summary: 'Get document version by ID' })
  async findOneDocumentVersion(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('documents', {
      method: 'GET',
      path: `/document-versions/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('document-versions')
  @ApiOperation({ summary: 'Create document version' })
  async createDocumentVersion(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('documents', {
      method: 'POST',
      path: '/document-versions',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('document-versions/:id')
  @ApiOperation({ summary: 'Update document version' })
  async updateDocumentVersion(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('documents', {
      method: 'PUT',
      path: `/document-versions/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('document-versions/:id')
  @ApiOperation({ summary: 'Delete document version' })
  async removeDocumentVersion(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('documents', {
      method: 'DELETE',
      path: `/document-versions/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }
}
