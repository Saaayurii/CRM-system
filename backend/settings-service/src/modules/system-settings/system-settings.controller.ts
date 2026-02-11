import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SystemSettingsService } from './system-settings.service';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('System Settings')
@ApiBearerAuth()
@Controller('system-settings')
export class SystemSettingsController {
  constructor(private readonly svc: SystemSettingsService) {}
  @Get() @ApiOperation({ summary: 'Get system settings' }) getSettings(
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.svc.getSettings(accountId);
  }
  @Put() @ApiOperation({ summary: 'Update system settings' }) updateSettings(
    @CurrentUser('accountId') accountId: number,
    @Body() dto: UpdateSystemSettingsDto,
  ) {
    return this.svc.updateSettings(accountId, dto);
  }
}
