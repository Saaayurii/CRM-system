import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomEventTypesService } from './custom-event-types.service';
import { CreateCustomEventTypeDto, UpdateCustomEventTypeDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Calendar / Custom Event Types')
@ApiBearerAuth()
@Controller('calendar-custom-event-types')
export class CustomEventTypesController {
  constructor(private readonly service: CustomEventTypesService) {}

  @Get()
  @ApiOperation({ summary: 'Список пользовательских типов событий' })
  findAll(@CurrentUser('accountId') accountId: number) {
    return this.service.findAll(accountId);
  }

  @Get(':id')
  findById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.service.findById(id, accountId);
  }

  @Post()
  create(
    @CurrentUser('accountId') accountId: number,
    @Body() dto: CreateCustomEventTypeDto,
  ) {
    return this.service.create(accountId, dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
    @Body() dto: UpdateCustomEventTypeDto,
  ) {
    return this.service.update(id, accountId, dto);
  }

  @Delete(':id')
  delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.service.delete(id, accountId);
  }
}
