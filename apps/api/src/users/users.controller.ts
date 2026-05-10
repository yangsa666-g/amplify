import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findByIdPublic(id);
  }

  @Post()
  create(@Body() body: { name: string; email: string; password: string; role?: 'admin' | 'user' }) {
    if (!body.name || !body.email || !body.password) {
      throw new BadRequestException('name, email, and password are required');
    }
    return this.usersService.createUser(body.name, body.email, body.password, body.role ?? 'user');
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { name?: string; email?: string }, @CurrentUser() user: AuthUser) {
    if (id === user.userId) {
      throw new BadRequestException('Use the profile page to update your own account');
    }
    return this.usersService.updateUser(id, body);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: 'active' | 'disabled' }, @CurrentUser() user: AuthUser) {
    if (id === user.userId) {
      throw new BadRequestException('Cannot change your own status');
    }
    return this.usersService.updateStatus(id, body.status);
  }

  @Patch(':id/role')
  updateRole(@Param('id') id: string, @Body() body: { role: 'admin' | 'user' }, @CurrentUser() user: AuthUser) {
    if (id === user.userId) {
      throw new BadRequestException('Cannot change your own role');
    }
    return this.usersService.updateRole(id, body.role);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (id === user.userId) {
      throw new BadRequestException('Cannot delete your own account');
    }
    return this.usersService.deleteUser(id);
  }
}
