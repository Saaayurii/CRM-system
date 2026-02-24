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
} from '@nestjs/swagger';
import { TimeOffService } from './time-off.service';
import { CreateTimeOffRequestDto, UpdateTimeOffRequestDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface RequestUser {
  id: number;
  email: string;
  roleId: number;
  accountId: number;
}

@ApiTags('Time Off Requests')
@ApiBearerAuth()
@Controller('time-off-requests')
export class TimeOffController {
  constructor(private readonly service: TimeOffService) {}

  @Get()
  @ApiOperation({ summary: 'Get all time-off requests for current user' })
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
  @ApiOperation({ summary: 'Get time-off request by ID' })
  findById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findById(id, user.id, user.roleId);
  }

  @Post()
  @ApiOperation({ summary: 'Create time-off request' })
  create(
    @Body() dto: CreateTimeOffRequestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.create(user.id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update time-off request' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTimeOffRequestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, user.id, user.roleId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete time-off request' })
  delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.delete(id, user.id, user.roleId);
  }
}
