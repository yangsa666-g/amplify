import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminDashboardService } from './admin-dashboard.service';

type Period = '24h' | '7d' | '30d';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminDashboardController {
  constructor(private adminDashboardService: AdminDashboardService) {}

  @Get('stats')
  getStats(@Query('period') period: Period = '7d') {
    const validPeriods: Period[] = ['24h', '7d', '30d'];
    const safePeriod = validPeriods.includes(period) ? period : '7d';
    return this.adminDashboardService.getStats(safePeriod);
  }
}
