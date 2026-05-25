import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FinancialReportsService, FinancialReportFormat } from './financial-reports.service';

@ApiTags('Financial Reports')
@ApiBearerAuth()
@Controller('financial-reports')
export class FinancialReportsController {
  constructor(private readonly svc: FinancialReportsService) {}

  @Get('project/:projectId/articles')
  @ApiOperation({ summary: 'List distinct expense articles used in project payments' })
  articles(
    @CurrentUser('accountId') accountId: number,
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.svc.listExpenseArticles(accountId, projectId);
  }

  @Get('project/:projectId/export')
  @ApiOperation({ summary: 'Export project financial report as PDF' })
  @ApiQuery({ name: 'format', enum: ['expense-statement', 'balance-detail'], required: true })
  @ApiQuery({ name: 'article', required: false })
  @ApiQuery({ name: 'periodFrom', required: false })
  @ApiQuery({ name: 'periodTo', required: false })
  async export(
    @CurrentUser('accountId') accountId: number,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query('format') format: string,
    @Query('article') article: string | undefined,
    @Query('periodFrom') periodFrom: string | undefined,
    @Query('periodTo') periodTo: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!['expense-statement', 'balance-detail'].includes(format)) {
      throw new BadRequestException('format must be expense-statement or balance-detail');
    }
    const buffer = await this.svc.generate(
      accountId,
      projectId,
      format as FinancialReportFormat,
      { article, periodFrom, periodTo },
      req.headers.authorization,
    );
    const stamp = new Date().toISOString().slice(0, 10);
    const slug = format === 'expense-statement' ? 'expense' : 'balance';
    const filename = `${slug}-project-${projectId}-${stamp}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
