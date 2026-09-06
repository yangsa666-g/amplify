import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { requireOrganizationContext } from '../auth/access-context';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';

@Controller('admin/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  find(@CurrentUser() user: AuthUser, @Query() query: AuditQueryDto) {
    return this.auditService.find(query, this.auditOrganizationId(user));
  }

  @Get('actions')
  actions(@CurrentUser() user: AuthUser) {
    return this.auditService.getActions(this.auditOrganizationId(user));
  }

  @Get('retention')
  retention() {
    return this.auditService.getRetention();
  }

  @Post('cleanup')
  cleanup() {
    return this.auditService.cleanupExpired('manual');
  }

  private auditOrganizationId(user: AuthUser) {
    if (user.role === 'super_admin' && !user.selectedOrganizationId) return null;
    return requireOrganizationContext(user).organizationId;
  }
}
