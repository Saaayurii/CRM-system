import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ContractsService } from './contracts.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateContractDto, UpdateContractDto } from './dto/upsert-contract.dto';

@ApiTags('Contracts')
@ApiBearerAuth()
@Controller('contracts')
export class ContractsController {
  constructor(private readonly svc: ContractsService) {}

  @Get()
  @ApiOperation({ summary: 'List contracts' })
  @ApiQuery({ name: 'projectId', required: false })
  list(
    @CurrentUser('accountId') accountId: number,
    @Query('projectId') projectId?: string,
  ) {
    return this.svc.list(accountId, projectId ? Number(projectId) : undefined);
  }

  @Get(':id')
  get(@CurrentUser('accountId') accountId: number, @Param('id', ParseIntPipe) id: number) {
    return this.svc.get(accountId, id);
  }

  @Post()
  create(@CurrentUser('accountId') accountId: number, @Body() dto: CreateContractDto) {
    return this.svc.create(accountId, dto);
  }

  @Put(':id')
  update(
    @CurrentUser('accountId') accountId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContractDto,
  ) {
    return this.svc.update(accountId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('accountId') accountId: number, @Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(accountId, id);
  }
}
