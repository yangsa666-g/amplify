import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';

@Controller('admin/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  find(@Query() query: AuditQueryDto) {
    return this.auditService.find(query);
  }

  @Get('actions')
  actions() {
    return this.auditService.getActions();
  }

  @Get('retention')
  retention() {
    return this.auditService.getRetention();
  }

  @Post('cleanup')
  cleanup() {
    return this.auditService.cleanupExpired('manual');
  }
}
