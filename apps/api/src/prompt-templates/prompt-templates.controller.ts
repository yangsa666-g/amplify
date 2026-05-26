import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { PromptTemplatesService } from './prompt-templates.service';
import { PromptTemplateBodyDto } from './dto/prompt-template.dto';

// ─── User Routes ─────────────────────────────────────────────────────────────

@Controller('prompt-templates')
@UseGuards(JwtAuthGuard)
export class PromptTemplatesController {
  constructor(private service: PromptTemplatesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('type') type = 'risk_analysis') {
    return this.service.listForUser(user.userId, type);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.getById(id, user.userId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Query('type') type = 'risk_analysis',
    @Body() body: PromptTemplateBodyDto,
  ) {
    return this.service.createUserTemplate(user.userId, body, type);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: PromptTemplateBodyDto,
  ) {
    return this.service.updateUserTemplate(user.userId, id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.deleteUserTemplate(user.userId, id);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') systemId: string, @CurrentUser() user: AuthUser) {
    return this.service.duplicateSystemTemplate(user.userId, systemId);
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
  create(@Query('type') type = 'risk_analysis', @Body() body: PromptTemplateBodyDto) {
    return this.service.createSystemTemplate(body, type);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: PromptTemplateBodyDto) {
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
