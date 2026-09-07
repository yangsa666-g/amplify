import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { TemplateRequestsService } from './template-requests.service';
import { SubmitTemplateRequestDto, RejectTemplateRequestDto } from './dto/template-requests.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class TemplateRequestsController {
  constructor(private svc: TemplateRequestsService) {}

  // ─── User endpoints ───────────────────────────────────────────────────────────

  @Get('template-requests')
  listMine(@CurrentUser() user: AuthUser) {
    return this.svc.listForUser(user);
  }

  @Post('template-requests')
  submit(@CurrentUser() user: AuthUser, @Body() body: SubmitTemplateRequestDto) {
    return this.svc.submit(user, body);
  }

  // ─── Admin endpoints ──────────────────────────────────────────────────────────

  @Get('admin/template-requests')
  @UseGuards(RolesGuard)
  @Roles('admin')
  listPending(@CurrentUser() user: AuthUser) {
    return this.svc.listPending(user);
  }

  @Put('admin/template-requests/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('admin')
  approve(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.approve(user, id);
  }

  @Put('admin/template-requests/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('admin')
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: RejectTemplateRequestDto,
  ) {
    return this.svc.reject(user, id, body.adminNote);
  }
}
