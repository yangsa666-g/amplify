import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OrganizationsService } from './organizations.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  UpdateOrganizationStatusDto,
} from './dto/organization.dto';

@Controller('admin/organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class OrganizationsController {
  constructor(private organizations: OrganizationsService) {}

  @Get()
  findAll() {
    return this.organizations.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.organizations.findOne(id);
  }

  @Post()
  create(@Body() body: CreateOrganizationDto) {
    return this.organizations.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateOrganizationDto) {
    return this.organizations.update(id, body);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: UpdateOrganizationStatusDto) {
    return this.organizations.updateStatus(id, body.status);
  }
}
