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
import { InspectionsService } from './inspections.service';
import {
  CreateInspectionDto,
  UpdateInspectionDto,
  CreateInspectionTemplateDto,
  UpdateInspectionTemplateDto,
} from './dto';

interface RequestUser {
  id: number;
  email: string;
  roleId: number;
  accountId: number;
}

@ApiTags('Inspections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inspections')
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all inspections with pagination' })
  @ApiResponse({ status: 200, description: 'List of inspections' })
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
    return this.inspectionsService.findAll(
      user.accountId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status !== undefined ? parseInt(status, 10) : undefined,
      projectId !== undefined ? parseInt(projectId, 10) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inspection by ID' })
  @ApiResponse({ status: 200, description: 'Inspection details' })
  @ApiResponse({ status: 404, description: 'Inspection not found' })
  async findById(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.inspectionsService.findById(id, user.accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new inspection' })
  @ApiResponse({ status: 201, description: 'Inspection created' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateInspectionDto,
  ) {
    return this.inspectionsService.create(user.accountId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an inspection' })
  @ApiResponse({ status: 200, description: 'Inspection updated' })
  @ApiResponse({ status: 404, description: 'Inspection not found' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInspectionDto,
  ) {
    return this.inspectionsService.update(id, user.accountId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an inspection' })
  @ApiResponse({ status: 200, description: 'Inspection deleted' })
  @ApiResponse({ status: 404, description: 'Inspection not found' })
  async delete(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.inspectionsService.delete(id, user.accountId);
  }
}

@ApiTags('Inspection Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inspection-templates')
export class InspectionTemplatesController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all inspection checklist templates' })
  @ApiResponse({ status: 200, description: 'List of templates' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAllTemplates(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inspectionsService.findAllTemplates(
      user.accountId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inspection template by ID' })
  @ApiResponse({ status: 200, description: 'Template details' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async findTemplateById(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.inspectionsService.findTemplateById(id, user.accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new inspection template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createTemplate(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateInspectionTemplateDto,
  ) {
    return this.inspectionsService.createTemplate(user.accountId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an inspection template' })
  @ApiResponse({ status: 200, description: 'Template updated' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async updateTemplate(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInspectionTemplateDto,
  ) {
    return this.inspectionsService.updateTemplate(id, user.accountId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an inspection template' })
  @ApiResponse({ status: 200, description: 'Template deleted' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async deleteTemplate(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.inspectionsService.deleteTemplate(id, user.accountId);
  }
}
