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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { GeneratedReportsService } from './generated-reports.service';
import { CreateGeneratedReportDto } from './dto/create-generated-report.dto';
import { UpdateGeneratedReportDto } from './dto/update-generated-report.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Generated Reports')
@ApiBearerAuth()
@Controller('generated-reports')
export class GeneratedReportsController {
  constructor(
    private readonly generatedReportsService: GeneratedReportsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all generated reports' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'projectId', required: false, type: Number })
  @ApiQuery({ name: 'reportTemplateId', required: false, type: Number })
  findAll(
    @CurrentUser('accountId') accountId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('projectId') projectId?: number,
    @Query('reportTemplateId') reportTemplateId?: number,
  ) {
    const filters: any = {};
    if (projectId) filters.projectId = +projectId;
    if (reportTemplateId) filters.reportTemplateId = +reportTemplateId;
    return this.generatedReportsService.findAll(
      accountId,
      +page,
      +limit,
      filters,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get generated report by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.generatedReportsService.findById(id, accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create generated report' })
  create(
    @Body() dto: CreateGeneratedReportDto,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.generatedReportsService.create(accountId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update generated report' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGeneratedReportDto,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.generatedReportsService.update(id, accountId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete generated report' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.generatedReportsService.delete(id, accountId);
  }
}
