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

@ApiTags('Wiki')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class WikiGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  // Wiki Pages
  @Get('wiki-pages')
  @ApiOperation({ summary: 'Get all wiki pages' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllWikiPages(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.forward('wiki', {
      method: 'GET', path: '/wiki-pages',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('wiki-pages/:id')
  @ApiOperation({ summary: 'Get wiki page by ID' })
  async findOneWikiPage(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('wiki', {
      method: 'GET', path: `/wiki-pages/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('wiki-pages')
  @ApiOperation({ summary: 'Create wiki page' })
  async createWikiPage(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('wiki', {
      method: 'POST', path: '/wiki-pages',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('wiki-pages/:id')
  @ApiOperation({ summary: 'Update wiki page' })
  async updateWikiPage(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('wiki', {
      method: 'PUT', path: `/wiki-pages/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('wiki-pages/:id')
  @ApiOperation({ summary: 'Delete wiki page' })
  async removeWikiPage(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('wiki', {
      method: 'DELETE', path: `/wiki-pages/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }
}
