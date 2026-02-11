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
import { ReportTemplatesService } from './report-templates.service';
import { CreateReportTemplateDto } from './dto/create-report-template.dto';
import { UpdateReportTemplateDto } from './dto/update-report-template.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Report Templates')
@ApiBearerAuth()
@Controller('report-templates')
export class ReportTemplatesController {
  constructor(
    private readonly reportTemplatesService: ReportTemplatesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all report templates' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser('accountId') accountId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.reportTemplatesService.findAll(accountId, +page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get report template by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.reportTemplatesService.findById(id, accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create report template' })
  create(
    @Body() dto: CreateReportTemplateDto,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.reportTemplatesService.create(accountId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update report template' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReportTemplateDto,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.reportTemplatesService.update(id, accountId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete report template' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.reportTemplatesService.delete(id, accountId);
  }
}
