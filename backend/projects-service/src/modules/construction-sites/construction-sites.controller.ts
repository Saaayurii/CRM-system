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
import { ConstructionSitesService } from './construction-sites.service';
import { CreateConstructionSiteDto, UpdateConstructionSiteDto } from './dto';

interface RequestUser {
  id: number;
  email: string;
  roleId: number;
  accountId: number;
}

@ApiTags('Construction Sites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('construction-sites')
export class ConstructionSitesController {
  constructor(
    private readonly constructionSitesService: ConstructionSitesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all construction sites with pagination' })
  @ApiResponse({ status: 200, description: 'List of construction sites' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'projectId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: Number })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
  ) {
    return this.constructionSitesService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      projectId !== undefined ? parseInt(projectId, 10) : undefined,
      status !== undefined ? parseInt(status, 10) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get construction site by ID' })
  @ApiResponse({ status: 200, description: 'Construction site details' })
  @ApiResponse({ status: 404, description: 'Construction site not found' })
  async findById(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.constructionSitesService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new construction site' })
  @ApiResponse({ status: 201, description: 'Construction site created' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateConstructionSiteDto,
  ) {
    return this.constructionSitesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a construction site' })
  @ApiResponse({ status: 200, description: 'Construction site updated' })
  @ApiResponse({ status: 404, description: 'Construction site not found' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConstructionSiteDto,
  ) {
    return this.constructionSitesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a construction site' })
  @ApiResponse({ status: 200, description: 'Construction site deleted' })
  @ApiResponse({ status: 404, description: 'Construction site not found' })
  async delete(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.constructionSitesService.delete(id);
  }
}
