import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Res,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { PdfService } from './pdf.service';
import { GeneratePdfDto } from './dto/generate-pdf.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('PDF')
@ApiBearerAuth()
@Controller('pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Post('generate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Generate PDF for a single entity' })
  async generate(@Body() dto: GeneratePdfDto) {
    return this.pdfService.generatePdf(dto);
  }

  @Post('generate-list')
  @HttpCode(200)
  @ApiOperation({ summary: 'Generate PDF for a list of entities' })
  async generateList(
    @Body() body: { entityType: string; rows: Record<string, unknown>[]; title: string },
  ) {
    return this.pdfService.generateListPdf(body.entityType, body.rows, body.title);
  }

  @Get('download/:filename')
  @Public()
  @ApiOperation({ summary: 'Download a generated PDF file' })
  async download(@Param('filename') filename: string, @Res() res: Response) {
    const { stream, size } = this.pdfService.streamPdf(filename);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(size),
    });
    stream.pipe(res);
  }

  @Get('list')
  @ApiOperation({ summary: 'List all generated PDFs' })
  list() {
    return this.pdfService.listPdfs();
  }
}
