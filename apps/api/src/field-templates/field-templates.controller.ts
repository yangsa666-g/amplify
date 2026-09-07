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
    return this.service.listForUser(user);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.getById(id, user);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: FieldTemplateBodyDto) {
    return this.service.createUserTemplate(user, body);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: FieldTemplateBodyDto,
  ) {
    return this.service.updateUserTemplate(user, id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.deleteUserTemplate(user, id);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') systemId: string, @CurrentUser() user: AuthUser) {
    return this.service.duplicateSystemTemplate(user, systemId);
  }
}

// ─── Admin Routes ─────────────────────────────────────────────────────────────

@Controller('admin/field-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminFieldTemplatesController {
  constructor(private service: FieldTemplatesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.service.listSystemTemplates(user);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: FieldTemplateBodyDto) {
    return this.service.createSystemTemplate(user, body);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: FieldTemplateBodyDto,
  ) {
    return this.service.updateSystemTemplate(user, id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.deleteSystemTemplate(user, id);
  }

  @Post(':id/set-default')
  setDefault(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.setSystemDefault(user, id);
  }
}
