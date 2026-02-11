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
import { PayrollService } from './payroll.service';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { UpdatePayrollDto } from './dto/update-payroll.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Payroll')
@ApiBearerAuth()
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get()
  @ApiOperation({ summary: 'Get all payroll records' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'payrollPeriod', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: Number })
  findAll(
    @CurrentUser('accountId') accountId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('userId') userId?: number,
    @Query('payrollPeriod') payrollPeriod?: string,
    @Query('status') status?: number,
  ) {
    const filters: any = {};
    if (userId) filters.userId = +userId;
    if (payrollPeriod) filters.payrollPeriod = payrollPeriod;
    if (status !== undefined && status !== null) filters.status = +status;
    return this.payrollService.findAll(accountId, +page, +limit, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payroll record by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.payrollService.findById(id, accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create payroll record' })
  create(
    @Body() dto: CreatePayrollDto,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.payrollService.create(accountId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update payroll record' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePayrollDto,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.payrollService.update(id, accountId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete payroll record' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.payrollService.delete(id, accountId);
  }
}
