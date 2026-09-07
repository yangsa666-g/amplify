import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { HistoryService } from './history.service';

@Controller('history')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HistoryController {
  constructor(private historyService: HistoryService) {}

  // "My History": always scoped to the current user, even for admins.
  @Get()
  getRecent(@CurrentUser() user: AuthUser) {
    return this.historyService.getRecent(user);
  }

  // "All History": every user's history, admin-only.
  @Get('all')
  @Roles('admin')
  getAll(@CurrentUser() user: AuthUser) {
    return this.historyService.getAllForAdmin(user);
  }
}
