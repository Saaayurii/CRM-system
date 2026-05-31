import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NormCategoriesService } from './norm-categories.service';
import {
  CreateNormCategoryDto,
  UpdateNormCategoryDto,
} from './dto/norm-category.dto';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';

@ApiTags('Construction Norms — Categories')
@ApiBearerAuth()
@Controller('norm-categories')
export class NormCategoriesController {
  constructor(private readonly service: NormCategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List norm categories (with document counts)' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get norm category by id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Create norm category (super_admin)' })
  create(@Body() dto: CreateNormCategoryDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Update norm category (super_admin)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNormCategoryDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Delete norm category (super_admin)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
