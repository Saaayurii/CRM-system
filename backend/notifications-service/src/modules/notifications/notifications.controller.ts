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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // --- Notifications ---

  @Get('notifications')
  @ApiOperation({ summary: 'Get all notifications for current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Notifications retrieved' })
  findAllNotifications(
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isRead') isRead?: string,
  ) {
    return this.notificationsService.findAllNotifications(
      accountId,
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      isRead !== undefined ? isRead === 'true' : undefined,
    );
  }

  @Post('notifications')
  @ApiOperation({ summary: 'Create a notification' })
  @ApiResponse({ status: 201, description: 'Notification created' })
  createNotification(
    @CurrentUser('accountId') accountId: number,
    @Body() dto: CreateNotificationDto,
  ) {
    return this.notificationsService.createNotification(accountId, dto);
  }

  @Get('notifications/:id')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiResponse({ status: 200, description: 'Notification retrieved' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  findNotificationById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.notificationsService.findNotificationById(id, accountId);
  }

  @Put('notifications/:id')
  @ApiOperation({ summary: 'Update notification' })
  @ApiResponse({ status: 200, description: 'Notification updated' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  updateNotification(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
    @Body() dto: UpdateNotificationDto,
  ) {
    return this.notificationsService.updateNotification(id, accountId, dto);
  }

  @Put('notifications/:id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.notificationsService.markAsRead(id, accountId);
  }

  // --- Announcements ---

  @Get('announcements')
  @ApiOperation({ summary: 'Get all announcements' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Announcements retrieved' })
  findAllAnnouncements(
    @CurrentUser('accountId') accountId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.findAllAnnouncements(
      accountId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Post('announcements')
  @ApiOperation({ summary: 'Create an announcement' })
  @ApiResponse({ status: 201, description: 'Announcement created' })
  createAnnouncement(
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
    @Body() dto: CreateAnnouncementDto,
  ) {
    return this.notificationsService.createAnnouncement(accountId, userId, dto);
  }

  @Get('announcements/:id')
  @ApiOperation({ summary: 'Get announcement by ID' })
  @ApiResponse({ status: 200, description: 'Announcement retrieved' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  findAnnouncementById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.notificationsService.findAnnouncementById(id, accountId);
  }

  @Put('announcements/:id')
  @ApiOperation({ summary: 'Update announcement' })
  @ApiResponse({ status: 200, description: 'Announcement updated' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  updateAnnouncement(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.notificationsService.updateAnnouncement(id, accountId, dto);
  }

  @Delete('announcements/:id')
  @ApiOperation({ summary: 'Delete announcement' })
  @ApiResponse({ status: 200, description: 'Announcement deleted' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  deleteAnnouncement(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.notificationsService.deleteAnnouncement(id, accountId);
  }
}
