import { Controller, Get, Put, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PromptTemplatesService } from './prompt-templates.service';

@Controller('prompt-templates')
@UseGuards(JwtAuthGuard)
export class PromptTemplatesController {
  constructor(private service: PromptTemplatesService) {}

  @Get('current')
  getCurrent(@Request() req: any, @Query('type') type = 'risk_analysis') {
    return this.service.getCurrentForUser(req.user.userId, type);
  }

  @Put('current')
  saveCurrent(@Request() req: any, @Query('type') type = 'risk_analysis', @Body() body: { name: string; content: string }) {
    return this.service.saveForUser(req.user.userId, body, type);
  }

  @Post('current/reset')
  reset(@Request() req: any, @Query('type') type = 'risk_analysis') {
    return this.service.resetForUser(req.user.userId, type);
  }
}

@Controller('admin/prompt-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminPromptTemplatesController {
  constructor(private service: PromptTemplatesService) {}

  @Get('default')
  getDefault(@Query('type') type = 'risk_analysis') {
    return this.service.getSystemDefault(type);
  }

  @Put('default')
  updateDefault(@Query('type') type = 'risk_analysis', @Body() body: { name: string; content: string }) {
    return this.service.updateSystemDefault(body, type);
  }
}
