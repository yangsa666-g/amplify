import { Controller, Get, Post, Put, Param, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TemplateRequestsService } from './template-requests.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class TemplateRequestsController {
  constructor(private svc: TemplateRequestsService) {}

  // ─── User endpoints ───────────────────────────────────────────────────────────

  @Get('template-requests')
  listMine(@Request() req: any) {
    return this.svc.listForUser(req.user.userId);
  }

  @Post('template-requests')
  submit(@Request() req: any, @Body() body: { templateKind: 'field' | 'prompt'; templateId: string }) {
    return this.svc.submit(req.user.userId, body);
  }

  // ─── Admin endpoints ──────────────────────────────────────────────────────────

  @Get('admin/template-requests')
  @UseGuards(RolesGuard)
  @Roles('admin')
  listPending() {
    return this.svc.listPending();
  }

  @Put('admin/template-requests/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('admin')
  approve(@Request() req: any, @Param('id') id: string) {
    return this.svc.approve(req.user.userId, id);
  }

  @Put('admin/template-requests/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('admin')
  reject(@Request() req: any, @Param('id') id: string, @Body() body: { adminNote?: string }) {
    return this.svc.reject(req.user.userId, id, body.adminNote);
  }
}
