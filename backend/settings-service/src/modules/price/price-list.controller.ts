import { BadRequestException, Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PriceService } from './price.service';
import { PriceExportService } from './price-export.service';
import { PriceImportService } from './price-import.service';
import { ImportPriceListDto } from './dto/import-price-list.dto';

@ApiTags('Price — Aggregate')
@ApiBearerAuth()
@Controller('price-list')
export class PriceListController {
  constructor(
    private readonly svc: PriceService,
    private readonly exportSvc: PriceExportService,
    private readonly importSvc: PriceImportService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get full price list: project categories, categories, items with prices and modifiers',
  })
  get(@CurrentUser('accountId') accountId: number) {
    return this.svc.getPriceList(accountId);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export price list as PDF or XLSX' })
  @ApiQuery({ name: 'format', enum: ['pdf', 'xlsx'], required: true })
  async export(
    @CurrentUser('accountId') accountId: number,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === 'pdf') {
      const buffer = await this.exportSvc.generatePdf(accountId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="price-list-${stamp}.pdf"`);
      res.send(buffer);
      return;
    }
    if (format === 'xlsx') {
      const buffer = await this.exportSvc.generateXlsx(accountId);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', `attachment; filename="price-list-${stamp}.xlsx"`);
      res.send(buffer);
      return;
    }
    throw new BadRequestException('format must be "pdf" or "xlsx"');
  }

  @Post('import')
  @ApiOperation({ summary: 'Import price list rows (parsed CSV) — supports dryRun preview' })
  import(
    @CurrentUser('accountId') accountId: number,
    @Body() dto: ImportPriceListDto,
  ) {
    return this.importSvc.run(accountId, dto);
  }
}
