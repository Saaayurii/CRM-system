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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { ProxyService } from '../../common/services/proxy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';

const USER_MANAGE_ROLES = [1, 2, 3]; // super_admin, admin, hr_manager

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/users')
export class UsersGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('users', {
      method: 'GET',
      path: '/users',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('by-role/:roleId')
  @ApiOperation({ summary: 'Get users by role' })
  async findByRole(@Req() req: Request, @Param('roleId') roleId: string) {
    return this.proxyService.forward('users', {
      method: 'GET',
      path: `/users/by-role/${roleId}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('users', {
      method: 'GET',
      path: `/users/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post()
  @Roles(...USER_MANAGE_ROLES)
  @ApiOperation({ summary: 'Create new user' })
  async create(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('users', {
      method: 'POST',
      path: '/users',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put(':id/password')
  @ApiOperation({ summary: 'Change user password' })
  async changePassword(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('users', {
      method: 'PUT',
      path: `/users/${id}/password`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user' })
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('users', {
      method: 'PUT',
      path: `/users/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete(':id')
  @Roles(...USER_MANAGE_ROLES)
  @ApiOperation({ summary: 'Delete user' })
  async remove(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('users', {
      method: 'DELETE',
      path: `/users/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }
}
