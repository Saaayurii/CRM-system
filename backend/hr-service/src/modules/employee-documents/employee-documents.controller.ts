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
import { EmployeeDocumentsService } from './employee-documents.service';
import { CreateEmployeeDocumentDto, UpdateEmployeeDocumentDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface RequestUser {
  id: number;
  email: string;
  roleId: number;
  accountId: number;
}

@ApiTags('Employee Documents')
@ApiBearerAuth()
@Controller('employee-documents')
export class EmployeeDocumentsController {
  constructor(private readonly service: EmployeeDocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all employee documents for current account' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(
      user.accountId,
      Number(page) || 1,
      Number(limit) || 20,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee document by ID' })
  findById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findById(id, user.accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create employee document' })
  create(
    @Body() dto: CreateEmployeeDocumentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.create(user.id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update employee document' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDocumentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, user.accountId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete employee document' })
  delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.delete(id, user.accountId);
  }
}
