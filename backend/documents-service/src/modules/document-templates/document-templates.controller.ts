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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DocumentTemplatesService } from './document-templates.service';
import { CreateDocumentTemplateDto } from './dto/create-document-template.dto';
import { UpdateDocumentTemplateDto } from './dto/update-document-template.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Document Templates')
@ApiBearerAuth()
@Controller('document-templates')
export class DocumentTemplatesController {
  constructor(private readonly documentTemplatesService: DocumentTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all document templates' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser('accountId') accountId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.documentTemplatesService.findAll(accountId, +page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document template by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.documentTemplatesService.findById(id, accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create document template' })
  create(
    @Body() dto: CreateDocumentTemplateDto,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.documentTemplatesService.create(accountId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update document template' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDocumentTemplateDto,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.documentTemplatesService.update(id, accountId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete document template' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.documentTemplatesService.delete(id, accountId);
  }
}
