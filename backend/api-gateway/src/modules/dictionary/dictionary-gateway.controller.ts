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

@ApiTags('Dictionary')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class DictionaryGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  // Dictionaries
  @Get('dictionaries')
  @ApiOperation({ summary: 'Get all dictionaries' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllDictionaries(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.forward('dictionary', {
      method: 'GET', path: '/dictionaries',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('dictionaries/:id')
  @ApiOperation({ summary: 'Get dictionary by ID' })
  async findOneDictionary(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('dictionary', {
      method: 'GET', path: `/dictionaries/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('dictionaries')
  @ApiOperation({ summary: 'Create dictionary' })
  async createDictionary(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('dictionary', {
      method: 'POST', path: '/dictionaries',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('dictionaries/:id')
  @ApiOperation({ summary: 'Update dictionary' })
  async updateDictionary(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('dictionary', {
      method: 'PUT', path: `/dictionaries/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('dictionaries/:id')
  @ApiOperation({ summary: 'Delete dictionary' })
  async removeDictionary(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('dictionary', {
      method: 'DELETE', path: `/dictionaries/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Dictionary Values
  @Get('dictionary-values')
  @ApiOperation({ summary: 'Get all dictionary values' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllDictionaryValues(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.forward('dictionary', {
      method: 'GET', path: '/dictionary-values',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('dictionary-values/:id')
  @ApiOperation({ summary: 'Get dictionary value by ID' })
  async findOneDictionaryValue(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('dictionary', {
      method: 'GET', path: `/dictionary-values/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('dictionary-values')
  @ApiOperation({ summary: 'Create dictionary value' })
  async createDictionaryValue(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('dictionary', {
      method: 'POST', path: '/dictionary-values',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('dictionary-values/:id')
  @ApiOperation({ summary: 'Update dictionary value' })
  async updateDictionaryValue(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('dictionary', {
      method: 'PUT', path: `/dictionary-values/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('dictionary-values/:id')
  @ApiOperation({ summary: 'Delete dictionary value' })
  async removeDictionaryValue(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('dictionary', {
      method: 'DELETE', path: `/dictionary-values/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }
}
