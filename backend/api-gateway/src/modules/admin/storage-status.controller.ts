import { Controller, Get, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StorageService } from '../../common/services/storage.service';
import { Roles } from '../../common/decorators/roles.decorator';

const SUPER_ADMIN_ROLE_ID = 1;

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(1)
@Controller('api/v1/admin/storage')
export class StorageStatusController {
  constructor(private readonly storage: StorageService) {}

  @Get('status')
  @ApiOperation({ summary: 'S3 storage status & recent logs (super_admin only)' })
  async status(@CurrentUser('roleId') roleId: number | null) {
    if (roleId !== SUPER_ADMIN_ROLE_ID) {
      throw new ForbiddenException('Доступно только супер-администратору');
    }
    return this.storage.getStatus();
  }
}
