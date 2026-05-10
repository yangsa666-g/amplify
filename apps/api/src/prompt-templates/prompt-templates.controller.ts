import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PromptTemplatesService } from './prompt-templates.service';

// ─── User Routes ─────────────────────────────────────────────────────────────

@Controller('prompt-templates')
@UseGuards(JwtAuthGuard)
export class PromptTemplatesController {
  constructor(private service: PromptTemplatesService) {}

  @Get()
  list(@Request() req: any, @Query('type') type = 'risk_analysis') {
    return this.service.listForUser(req.user.userId, type);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @Request() req: any) {
    return this.service.getById(id, req.user.userId);
  }

  @Post()
  create(@Request() req: any, @Query('type') type = 'risk_analysis', @Body() body: { name: string; content: string }) {
    return this.service.createUserTemplate(req.user.userId, body, type);
  }

  @Put(':id')
  update(@Param('id') id: string, @Request() req: any, @Body() body: { name: string; content: string }) {
    return this.service.updateUserTemplate(req.user.userId, id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.service.deleteUserTemplate(req.user.userId, id);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') systemId: string, @Request() req: any) {
    return this.service.duplicateSystemTemplate(req.user.userId, systemId);
  }
}

// ─── Admin Routes ─────────────────────────────────────────────────────────────

@Controller('admin/prompt-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminPromptTemplatesController {
  constructor(private service: PromptTemplatesService) {}

  @Get()
  list(@Query('type') type = 'risk_analysis') {
    return this.service.listSystemTemplates(type);
  }

  @Post()
  create(@Query('type') type = 'risk_analysis', @Body() body: { name: string; content: string }) {
    return this.service.createSystemTemplate(body, type);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: { name: string; content: string }) {
    return this.service.updateSystemTemplate(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.deleteSystemTemplate(id);
  }

  @Post(':id/set-default')
  setDefault(@Param('id') id: string, @Query('type') type = 'risk_analysis') {
    return this.service.setSystemDefault(id, type);
  }
}
