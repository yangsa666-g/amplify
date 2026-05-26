import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { FieldTemplatesService } from './field-templates.service';
import { FieldTemplateBodyDto } from './dto/field-template.dto';

// ─── User Routes ─────────────────────────────────────────────────────────────

@Controller('field-templates')
@UseGuards(JwtAuthGuard)
export class FieldTemplatesController {
  constructor(private service: FieldTemplatesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.service.listForUser(user.userId);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.getById(id, user.userId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: FieldTemplateBodyDto) {
    return this.service.createUserTemplate(user.userId, body);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: FieldTemplateBodyDto,
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

@Controller('admin/field-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminFieldTemplatesController {
  constructor(private service: FieldTemplatesService) {}

  @Get()
  list() {
    return this.service.listSystemTemplates();
  }

  @Post()
  create(@Body() body: FieldTemplateBodyDto) {
    return this.service.createSystemTemplate(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: FieldTemplateBodyDto) {
    return this.service.updateSystemTemplate(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.deleteSystemTemplate(id);
  }

  @Post(':id/set-default')
  setDefault(@Param('id') id: string) {
    return this.service.setSystemDefault(id);
  }
}
