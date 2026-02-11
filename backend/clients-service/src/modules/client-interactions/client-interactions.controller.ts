import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ClientInteractionsService } from './client-interactions.service';
import { CreateClientInteractionDto } from './dto/create-client-interaction.dto';
import { UpdateClientInteractionDto } from './dto/update-client-interaction.dto';

@ApiTags('Client Interactions')
@ApiBearerAuth()
@Controller('client-interactions')
export class ClientInteractionsController {
  constructor(private readonly svc: ClientInteractionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all client interactions' })
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
  @ApiOperation({ summary: 'Get client interaction by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create client interaction' })
  create(@Body() dto: CreateClientInteractionDto) {
    return this.svc.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update client interaction' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClientInteractionDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete client interaction' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.delete(id);
  }
}
