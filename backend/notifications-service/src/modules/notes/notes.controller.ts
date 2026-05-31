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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotesService } from './notes.service';
import { CreateNoteDto, UpdateNoteDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Notes')
@ApiBearerAuth()
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notes for current user' })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'history'] })
  findAll(
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
    @Query('status') status?: string,
  ) {
    return this.notesService.findAll(accountId, userId, status);
  }

  @Get('due')
  @ApiOperation({ summary: 'Get notes whose reminder is due (for popup)' })
  findDue(
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.notesService.findDue(accountId, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a note' })
  create(
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
    @Body() dto: CreateNoteDto,
  ) {
    return this.notesService.create(accountId, userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a note' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notesService.update(id, accountId, userId, dto);
  }

  @Put(':id/dismiss')
  @ApiOperation({ summary: 'Dismiss a note reminder (move to history)' })
  dismiss(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.notesService.dismiss(id, accountId, userId);
  }

  @Put(':id/restore')
  @ApiOperation({ summary: 'Restore a dismissed note (make active again)' })
  restore(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.notesService.restore(id, accountId, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a note' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.notesService.remove(id, accountId, userId);
  }
}
