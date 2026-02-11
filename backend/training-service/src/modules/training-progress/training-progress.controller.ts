import {
  Controller,
  Get,
  Post,
  Put,
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
import { TrainingProgressService } from './training-progress.service';
import { CreateTrainingProgressDto } from './dto/create-training-progress.dto';
import { UpdateTrainingProgressDto } from './dto/update-training-progress.dto';

@ApiTags('Training Progress')
@ApiBearerAuth()
@Controller('training-progress')
export class TrainingProgressController {
  constructor(private readonly svc: TrainingProgressService) {}
  @Get()
  @ApiOperation({ summary: 'Get all training progress' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'trainingMaterialId', required: false })
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('userId') userId?: number,
    @Query('trainingMaterialId') tmId?: number,
  ) {
    return this.svc.findAll(
      +page,
      +limit,
      userId ? +userId : undefined,
      tmId ? +tmId : undefined,
    );
  }
  @Get(':id') @ApiOperation({ summary: 'Get training progress by ID' }) findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.svc.findById(id);
  }
  @Post() @ApiOperation({ summary: 'Create training progress' }) create(
    @Body() dto: CreateTrainingProgressDto,
  ) {
    return this.svc.create(dto);
  }
  @Put(':id') @ApiOperation({ summary: 'Update training progress' }) update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTrainingProgressDto,
  ) {
    return this.svc.update(id, dto);
  }
}
