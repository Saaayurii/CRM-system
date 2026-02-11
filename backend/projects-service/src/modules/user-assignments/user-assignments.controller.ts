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
import { UserAssignmentsService } from './user-assignments.service';
import { CreateUserAssignmentDto, UpdateUserAssignmentDto } from './dto';

interface RequestUser {
  id: number;
  email: string;
  roleId: number;
  accountId: number;
}

@ApiTags('User Assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user-assignments')
export class UserAssignmentsController {
  constructor(
    private readonly userAssignmentsService: UserAssignmentsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all user project assignments with pagination' })
  @ApiResponse({ status: 200, description: 'List of user assignments' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'projectId', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('projectId') projectId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.userAssignmentsService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      projectId !== undefined ? parseInt(projectId, 10) : undefined,
      userId !== undefined ? parseInt(userId, 10) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user assignment by ID' })
  @ApiResponse({ status: 200, description: 'User assignment details' })
  @ApiResponse({ status: 404, description: 'User assignment not found' })
  async findById(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.userAssignmentsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user project assignment' })
  @ApiResponse({ status: 201, description: 'User assignment created' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateUserAssignmentDto,
  ) {
    return this.userAssignmentsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a user project assignment' })
  @ApiResponse({ status: 200, description: 'User assignment updated' })
  @ApiResponse({ status: 404, description: 'User assignment not found' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserAssignmentDto,
  ) {
    return this.userAssignmentsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user project assignment' })
  @ApiResponse({ status: 200, description: 'User assignment deleted' })
  @ApiResponse({ status: 404, description: 'User assignment not found' })
  async delete(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.userAssignmentsService.delete(id);
  }
}
