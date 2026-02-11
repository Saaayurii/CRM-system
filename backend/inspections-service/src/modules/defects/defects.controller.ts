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
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DefectsService } from './defects.service';
import {
  CreateDefectDto,
  UpdateDefectDto,
  CreateDefectTemplateDto,
  UpdateDefectTemplateDto,
} from './dto';

interface RequestUser {
  id: number;
  email: string;
  roleId: number;
  accountId: number;
}

@ApiTags('Defects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('defects')
export class DefectsController {
  constructor(private readonly defectsService: DefectsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all defects with pagination' })
  @ApiResponse({ status: 200, description: 'List of defects' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: Number })
  @ApiQuery({ name: 'projectId', required: false, type: Number })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.defectsService.findAll(
      user.accountId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status !== undefined ? parseInt(status, 10) : undefined,
      projectId !== undefined ? parseInt(projectId, 10) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get defect by ID' })
  @ApiResponse({ status: 200, description: 'Defect details' })
  @ApiResponse({ status: 404, description: 'Defect not found' })
  async findById(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.defectsService.findById(id, user.accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new defect' })
  @ApiResponse({ status: 201, description: 'Defect created' })
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateDefectDto) {
    return this.defectsService.create(user.accountId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a defect' })
  @ApiResponse({ status: 200, description: 'Defect updated' })
  @ApiResponse({ status: 404, description: 'Defect not found' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDefectDto,
  ) {
    return this.defectsService.update(id, user.accountId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a defect' })
  @ApiResponse({ status: 200, description: 'Defect deleted' })
  @ApiResponse({ status: 404, description: 'Defect not found' })
  async delete(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.defectsService.delete(id, user.accountId);
  }
}

@ApiTags('Defect Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('defect-templates')
export class DefectTemplatesController {
  constructor(private readonly defectsService: DefectsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all defect templates with pagination' })
  @ApiResponse({ status: 200, description: 'List of defect templates' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAllTemplates(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.defectsService.findAllTemplates(
      user.accountId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get defect template by ID' })
  @ApiResponse({ status: 200, description: 'Template details' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async findTemplateById(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.defectsService.findTemplateById(id, user.accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new defect template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createTemplate(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateDefectTemplateDto,
  ) {
    return this.defectsService.createTemplate(user.accountId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a defect template' })
  @ApiResponse({ status: 200, description: 'Template updated' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async updateTemplate(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDefectTemplateDto,
  ) {
    return this.defectsService.updateTemplate(id, user.accountId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a defect template' })
  @ApiResponse({ status: 200, description: 'Template deleted' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async deleteTemplate(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.defectsService.deleteTemplate(id, user.accountId);
  }
}
