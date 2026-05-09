import { Controller, Get, Put, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FieldTemplatesService } from './field-templates.service';

@Controller('field-templates')
@UseGuards(JwtAuthGuard)
export class FieldTemplatesController {
  constructor(private service: FieldTemplatesService) {}

  @Get('current')
  getCurrent(@Request() req: any) {
    return this.service.getCurrentForUser(req.user.userId);
  }

  @Put('current')
  saveCurrent(@Request() req: any, @Body() body: { name: string; items: { fieldName: string; fieldDescription: string; sortOrder: number }[] }) {
    return this.service.saveForUser(req.user.userId, body);
  }

  @Post('current/reset')
  reset(@Request() req: any) {
    return this.service.resetForUser(req.user.userId);
  }
}

@Controller('admin/field-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminFieldTemplatesController {
  constructor(private service: FieldTemplatesService) {}

  @Get('default')
  getDefault() {
    return this.service.getSystemDefault();
  }

  @Put('default')
  updateDefault(@Body() body: { name: string; items: { fieldName: string; fieldDescription: string; sortOrder: number }[] }) {
    return this.service.updateSystemDefault(body);
  }
}
