import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsersService } from './users.service';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: 'active' | 'disabled' }) {
    return this.usersService.updateStatus(id, body.status);
  }

  @Patch(':id/role')
  updateRole(@Param('id') id: string, @Body() body: { role: 'admin' | 'user' }) {
    return this.usersService.updateRole(id, body.role);
  }
}
