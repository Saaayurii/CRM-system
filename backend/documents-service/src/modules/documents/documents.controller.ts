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
  ApiResponse,
} from '@nestjs/swagger';
import { DocumentResponseDto } from './dto/document-response.dto';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all documents' })
  @ApiResponse({ status: 200, type: DocumentResponseDto, isArray: true })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'projectId', required: false, type: Number })
  @ApiQuery({ name: 'documentType', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'constructionSiteId', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @CurrentUser() user: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('projectId') projectId?: number,
    @Query('documentType') documentType?: string,
    @Query('status') status?: string,
    @Query('constructionSiteId') constructionSiteId?: number,
    @Query('search') search?: string,
  ) {
    const filters: any = {};
    if (projectId) filters.projectId = +projectId;
    if (documentType) filters.documentType = documentType;
    if (status) filters.status = status;
    if (constructionSiteId) filters.constructionSiteId = +constructionSiteId;
    if (search?.trim()) filters.search = search.trim();
    return this.documentsService.findAll(user, +page, +limit, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiResponse({ status: 200, type: DocumentResponseDto })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.documentsService.findById(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Create document' })
  @ApiResponse({ status: 201, type: DocumentResponseDto })
  create(
    @Body() dto: CreateDocumentDto,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.documentsService.create(accountId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update document' })
  @ApiResponse({ status: 200, type: DocumentResponseDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.documentsService.update(id, accountId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete document' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.documentsService.delete(id, accountId);
  }
}
