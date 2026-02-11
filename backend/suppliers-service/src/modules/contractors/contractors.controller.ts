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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ContractorsService } from './contractors.service';
import {
  CreateContractorDto,
  UpdateContractorDto,
  CreateContractorAssignmentDto,
} from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface RequestUser {
  id: number;
  email: string;
  roleId: number;
  accountId: number;
}

@ApiTags('Contractors')
@ApiBearerAuth()
@Controller('contractors')
export class ContractorsController {
  constructor(private readonly contractorsService: ContractorsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all contractors' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Contractors retrieved successfully',
  })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.contractorsService.findAll(
      user.accountId,
      page || 1,
      limit || 20,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contractor by ID' })
  @ApiResponse({
    status: 200,
    description: 'Contractor retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Contractor not found' })
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.contractorsService.findById(id, user.accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new contractor' })
  @ApiResponse({ status: 201, description: 'Contractor created successfully' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() createContractorDto: CreateContractorDto,
  ) {
    return this.contractorsService.create(createContractorDto, user.accountId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update contractor' })
  @ApiResponse({ status: 200, description: 'Contractor updated successfully' })
  @ApiResponse({ status: 404, description: 'Contractor not found' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateContractorDto: UpdateContractorDto,
  ) {
    return this.contractorsService.update(
      id,
      updateContractorDto,
      user.accountId,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete contractor (soft delete)' })
  @ApiResponse({ status: 204, description: 'Contractor deleted successfully' })
  @ApiResponse({ status: 404, description: 'Contractor not found' })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.contractorsService.remove(id, user.accountId);
  }

  @Get(':id/assignments')
  @ApiOperation({ summary: 'Get contractor assignments' })
  @ApiResponse({
    status: 200,
    description: 'Assignments retrieved successfully',
  })
  async getAssignments(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.contractorsService.getAssignments(id, user.accountId);
  }

  @Post(':id/assignments')
  @ApiOperation({ summary: 'Add assignment to contractor' })
  @ApiResponse({ status: 201, description: 'Assignment added successfully' })
  @ApiResponse({ status: 404, description: 'Contractor not found' })
  async addAssignment(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() createAssignmentDto: CreateContractorAssignmentDto,
  ) {
    return this.contractorsService.addAssignment(
      id,
      createAssignmentDto,
      user.accountId,
    );
  }
}
