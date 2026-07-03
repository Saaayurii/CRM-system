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
import { AttendanceResponseDto } from './dto/attendance-response.dto';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto, UpdateAttendanceDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface RequestUser {
  id: number;
  email: string;
  roleId: number;
  accountId: number;
}

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Get()
  @ApiOperation({ summary: 'Get attendance records (admins see all)' })
  @ApiResponse({ status: 200, type: AttendanceResponseDto, isArray: true })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(
      user.id,
      user.roleId,
      Number(page) || 1,
      Number(limit) || 20,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get attendance record by ID' })
  @ApiResponse({ status: 200, type: AttendanceResponseDto })
  findById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findById(id, user.id, user.roleId);
  }

  @Post()
  @ApiOperation({ summary: 'Create attendance record' })
  @ApiResponse({ status: 201, type: AttendanceResponseDto })
  create(@Body() dto: CreateAttendanceDto, @CurrentUser() user: RequestUser) {
    return this.service.create(user.id, user.roleId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update attendance record' })
  @ApiResponse({ status: 200, type: AttendanceResponseDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAttendanceDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, user.id, user.roleId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete attendance record' })
  delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.delete(id, user.id, user.roleId);
  }
}
