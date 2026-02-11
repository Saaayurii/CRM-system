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

@ApiTags('Training')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class TrainingGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  // Training Materials
  @Get('training-materials')
  @ApiOperation({ summary: 'Get all training materials' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllTrainingMaterials(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.forward('training', {
      method: 'GET', path: '/training-materials',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('training-materials/:id')
  @ApiOperation({ summary: 'Get training material by ID' })
  async findOneTrainingMaterial(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('training', {
      method: 'GET', path: `/training-materials/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('training-materials')
  @ApiOperation({ summary: 'Create training material' })
  async createTrainingMaterial(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('training', {
      method: 'POST', path: '/training-materials',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('training-materials/:id')
  @ApiOperation({ summary: 'Update training material' })
  async updateTrainingMaterial(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('training', {
      method: 'PUT', path: `/training-materials/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('training-materials/:id')
  @ApiOperation({ summary: 'Delete training material' })
  async removeTrainingMaterial(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('training', {
      method: 'DELETE', path: `/training-materials/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Training Progress
  @Get('training-progress')
  @ApiOperation({ summary: 'Get all training progress records' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllTrainingProgress(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.forward('training', {
      method: 'GET', path: '/training-progress',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('training-progress/:id')
  @ApiOperation({ summary: 'Get training progress by ID' })
  async findOneTrainingProgress(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('training', {
      method: 'GET', path: `/training-progress/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('training-progress')
  @ApiOperation({ summary: 'Create training progress' })
  async createTrainingProgress(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('training', {
      method: 'POST', path: '/training-progress',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('training-progress/:id')
  @ApiOperation({ summary: 'Update training progress' })
  async updateTrainingProgress(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('training', {
      method: 'PUT', path: `/training-progress/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('training-progress/:id')
  @ApiOperation({ summary: 'Delete training progress' })
  async removeTrainingProgress(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('training', {
      method: 'DELETE', path: `/training-progress/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Knowledge Tests
  @Get('knowledge-tests')
  @ApiOperation({ summary: 'Get all knowledge tests' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllKnowledgeTests(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.forward('training', {
      method: 'GET', path: '/knowledge-tests',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('knowledge-tests/:id')
  @ApiOperation({ summary: 'Get knowledge test by ID' })
  async findOneKnowledgeTest(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('training', {
      method: 'GET', path: `/knowledge-tests/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('knowledge-tests')
  @ApiOperation({ summary: 'Create knowledge test' })
  async createKnowledgeTest(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('training', {
      method: 'POST', path: '/knowledge-tests',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('knowledge-tests/:id')
  @ApiOperation({ summary: 'Update knowledge test' })
  async updateKnowledgeTest(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('training', {
      method: 'PUT', path: `/knowledge-tests/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('knowledge-tests/:id')
  @ApiOperation({ summary: 'Delete knowledge test' })
  async removeKnowledgeTest(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('training', {
      method: 'DELETE', path: `/knowledge-tests/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Test Attempts (only GET list, GET :id, POST)
  @Get('test-attempts')
  @ApiOperation({ summary: 'Get all test attempts' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllTestAttempts(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.forward('training', {
      method: 'GET', path: '/test-attempts',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('test-attempts/:id')
  @ApiOperation({ summary: 'Get test attempt by ID' })
  async findOneTestAttempt(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('training', {
      method: 'GET', path: `/test-attempts/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('test-attempts')
  @ApiOperation({ summary: 'Create test attempt' })
  async createTestAttempt(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('training', {
      method: 'POST', path: '/test-attempts',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }
}
