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
  @ApiQuery({ name: 'constructionSiteId', required: false })
  async findAllDocuments(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('documentType') documentType?: string,
    @Query('status') status?: string,
    @Query('projectId') projectId?: number,
    @Query('search') search?: string,
    @Query('constructionSiteId') constructionSiteId?: number,
  ) {
    return this.proxyService.forward('documents', {
      method: 'GET',
      path: '/documents',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit, documentType, status, projectId, search, constructionSiteId },
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

  // Document Templates
  @Get('document-templates')
  @ApiOperation({ summary: 'Get all document templates' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllDocumentTemplates(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('documents', {
      method: 'GET',
      path: '/document-templates',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('document-templates/:id')
  @ApiOperation({ summary: 'Get document template by ID' })
  async findOneDocumentTemplate(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('documents', {
      method: 'GET',
      path: `/document-templates/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('document-templates')
  @ApiOperation({ summary: 'Create document template' })
  async createDocumentTemplate(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('documents', {
      method: 'POST',
      path: '/document-templates',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('document-templates/:id')
  @ApiOperation({ summary: 'Update document template' })
  async updateDocumentTemplate(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('documents', {
      method: 'PUT',
      path: `/document-templates/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('document-templates/:id')
  @ApiOperation({ summary: 'Delete document template' })
  async removeDocumentTemplate(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('documents', {
      method: 'DELETE',
      path: `/document-templates/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }
}
