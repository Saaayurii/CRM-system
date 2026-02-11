import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserPreferencesService } from './user-preferences.service';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('User Preferences')
@ApiBearerAuth()
@Controller('user-preferences')
export class UserPreferencesController {
  constructor(private readonly svc: UserPreferencesService) {}
  @Get() @ApiOperation({ summary: 'Get user preferences' }) getPreferences(
    @CurrentUser('id') userId: number,
  ) {
    return this.svc.getPreferences(userId);
  }
  @Put()
  @ApiOperation({ summary: 'Update user preferences' })
  updatePreferences(
    @CurrentUser('id') userId: number,
    @Body() dto: UpdateUserPreferencesDto,
  ) {
    return this.svc.updatePreferences(userId, dto);
  }
}
