import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Res,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { PdfService } from './pdf.service';
import { GeneratePdfDto } from './dto/generate-pdf.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('PDF')
@ApiBearerAuth()
@Controller('pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Post('generate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Generate PDF for a single entity' })
  async generate(@Body() dto: GeneratePdfDto, @CurrentUser('accountId') accountId: number) {
    return this.pdfService.generatePdf(dto, accountId);
  }

  @Post('generate-list')
  @HttpCode(200)
  @ApiOperation({ summary: 'Generate PDF for a list of entities' })
  async generateList(
    @Body() body: { entityType: string; rows: Record<string, unknown>[]; title: string },
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.pdfService.generateListPdf(body.entityType, body.rows, body.title, accountId);
  }

  @Post('generate-project-report')
  @HttpCode(200)
  @ApiOperation({ summary: 'Generate detailed project report PDF' })
  async generateProjectReport(
    @Body() body: {
      project: Record<string, unknown>;
      assignments: Record<string, unknown>[];
      tasks: Record<string, unknown>[];
      payments: Record<string, unknown>[];
      budgets: Record<string, unknown>[];
      notes: string;
    },
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.pdfService.generateProjectReport(body, accountId);
  }

  // No longer @Public(): ownership is only enforceable if we know the caller's
  // accountId, so this route now requires the same JWT the rest of the API
  // does (the gateway forwards Authorization for this proxied call).
  @Get('download/:filename')
  @ApiOperation({ summary: 'Download a generated PDF file' })
  async download(
    @Param('filename') filename: string,
    @CurrentUser('accountId') accountId: number,
    @Res() res: Response,
  ) {
    const { stream, size } = this.pdfService.streamPdf(filename, accountId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(size),
    });
    stream.pipe(res);
  }

  @Get('list')
  @ApiOperation({ summary: 'List all generated PDFs' })
  list(@CurrentUser('accountId') accountId: number) {
    return this.pdfService.listPdfs(accountId);
  }

  @Delete(':filename')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete a generated PDF file' })
  delete(@Param('filename') filename: string, @CurrentUser('accountId') accountId: number) {
    this.pdfService.deletePdf(filename, accountId);
    return { message: 'Файл удалён' };
  }
}
