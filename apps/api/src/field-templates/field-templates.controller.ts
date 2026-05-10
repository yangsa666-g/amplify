import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FieldTemplatesService } from './field-templates.service';

type ItemInput = { fieldName: string; fieldDescription: string; sortOrder: number };

// ─── User Routes ─────────────────────────────────────────────────────────────

@Controller('field-templates')
@UseGuards(JwtAuthGuard)
export class FieldTemplatesController {
  constructor(private service: FieldTemplatesService) {}

  @Get()
  list(@Request() req: any) {
    return this.service.listForUser(req.user.userId);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @Request() req: any) {
    return this.service.getById(id, req.user.userId);
  }

  @Post()
  create(@Request() req: any, @Body() body: { name: string; items: ItemInput[] }) {
    return this.service.createUserTemplate(req.user.userId, body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Request() req: any, @Body() body: { name: string; items: ItemInput[] }) {
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
  create(@Body() body: { name: string; items: ItemInput[] }) {
    return this.service.createSystemTemplate(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: { name: string; items: ItemInput[] }) {
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
