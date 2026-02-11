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
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(private readonly svc: ClientsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all clients' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'managerId', required: false })
  findAll(
    @CurrentUser('accountId') accountId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
    @Query('managerId') managerId?: number,
  ) {
    return this.svc.findAll(
      accountId,
      +page,
      +limit,
      status,
      managerId ? +managerId : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get client by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.svc.findById(id, accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create client' })
  create(
    @Body() dto: CreateClientDto,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.svc.create(accountId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update client' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClientDto,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.svc.update(id, accountId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete client' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.svc.delete(id, accountId);
  }
}
