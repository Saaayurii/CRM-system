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
import { ClientPortalAccessService } from './client-portal-access.service';
import { CreateClientPortalAccessDto } from './dto/create-client-portal-access.dto';
import { UpdateClientPortalAccessDto } from './dto/update-client-portal-access.dto';

@ApiTags('Client Portal Access')
@ApiBearerAuth()
@Controller('client-portal-access')
export class ClientPortalAccessController {
  constructor(private readonly svc: ClientPortalAccessService) {}

  @Get()
  @ApiOperation({ summary: 'Get all client portal access' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'clientId', required: false })
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('clientId') clientId?: number,
  ) {
    return this.svc.findAll(+page, +limit, clientId ? +clientId : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get client portal access by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create client portal access' })
  create(@Body() dto: CreateClientPortalAccessDto) {
    return this.svc.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update client portal access' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClientPortalAccessDto,
  ) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete client portal access' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.delete(id);
  }
}
