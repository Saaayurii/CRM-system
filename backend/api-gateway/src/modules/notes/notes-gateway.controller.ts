import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { ProxyService } from '../../common/services/proxy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class NotesGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  @Get('notes')
  @ApiOperation({ summary: 'Get all notes for current user' })
  @ApiQuery({ name: 'status', required: false })
  findAll(@Req() req: Request, @Query('status') status?: string) {
    return this.proxyService.forward('notifications', {
      method: 'GET',
      path: '/notes',
      headers: { authorization: req.headers.authorization || '' },
      params: { status },
    });
  }

  @Get('notes/due')
  @ApiOperation({ summary: 'Get due note reminders' })
  findDue(@Req() req: Request) {
    return this.proxyService.forward('notifications', {
      method: 'GET',
      path: '/notes/due',
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('notes')
  @ApiOperation({ summary: 'Create a note' })
  create(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('notifications', {
      method: 'POST',
      path: '/notes',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('notes/:id')
  @ApiOperation({ summary: 'Update a note' })
  update(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('notifications', {
      method: 'PUT',
      path: `/notes/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('notes/:id/dismiss')
  @ApiOperation({ summary: 'Dismiss a note reminder' })
  dismiss(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('notifications', {
      method: 'PUT',
      path: `/notes/${id}/dismiss`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Put('notes/:id/restore')
  @ApiOperation({ summary: 'Restore a dismissed note' })
  restore(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('notifications', {
      method: 'PUT',
      path: `/notes/${id}/restore`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Delete('notes/:id')
  @ApiOperation({ summary: 'Delete a note' })
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('notifications', {
      method: 'DELETE',
      path: `/notes/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }
}
