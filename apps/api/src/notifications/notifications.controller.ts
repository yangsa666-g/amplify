import { Controller, Get, Put, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private svc: NotificationsService) {}

  @Get()
  getAll(@Request() req: any) {
    return this.svc.getForUser(req.user.userId);
  }

  @Get('unread-count')
  getUnreadCount(@Request() req: any) {
    return this.svc.getUnreadCount(req.user.userId);
  }

  @Put(':id/read')
  markRead(@Request() req: any, @Param('id') id: string) {
    return this.svc.markRead(req.user.userId, id);
  }

  @Put('read-all')
  markAllRead(@Request() req: any) {
    return this.svc.markAllRead(req.user.userId);
  }
}
