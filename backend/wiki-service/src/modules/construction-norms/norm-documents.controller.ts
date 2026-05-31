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
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { NormDocumentsService } from './norm-documents.service';
import {
  CreateNormDocumentDto,
  UpdateNormDocumentDto,
} from './dto/norm-document.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';

@ApiTags('Construction Norms — Documents')
@ApiBearerAuth()
@Controller('norm-documents')
export class NormDocumentsController {
  constructor(private readonly service: NormDocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List / search norm documents' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'docType', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'q', required: false })
  findAll(
    @CurrentUser('id') userId: number,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('categoryId') categoryId?: string,
    @Query('docType') docType?: string,
    @Query('status') status?: string,
    @Query('tag') tag?: string,
    @Query('q') q?: string,
  ) {
    return this.service.findAll({
      page: +page || 1,
      limit: Math.min(+limit || 20, 100),
      categoryId: categoryId ? +categoryId : undefined,
      docType: docType || undefined,
      status: status || undefined,
      tag: tag || undefined,
      q: q || undefined,
      userId,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Aggregate stats for the norms base' })
  stats() {
    return this.service.stats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get norm document by id (increments view count)' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.service.findById(id, userId, true);
  }

  @Post()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Create norm document (super_admin)' })
  create(
    @Body() dto: CreateNormDocumentDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.service.create(userId, dto);
  }

  @Put(':id')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Update norm document (super_admin)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNormDocumentDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.service.update(id, userId, dto);
  }

  @Delete(':id')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Delete norm document (super_admin)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
