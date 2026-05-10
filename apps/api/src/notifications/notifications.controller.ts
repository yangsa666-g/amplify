import { Controller, Get, Put, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private svc: NotificationsService) {}

  @Get()
  getAll(@CurrentUser() user: AuthUser) {
    return this.svc.getForUser(user.userId);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: AuthUser) {
    return this.svc.getUnreadCount(user.userId);
  }

  @Put(':id/read')
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.markRead(user.userId, id);
  }

  @Put('read-all')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.svc.markAllRead(user.userId);
  }
}
