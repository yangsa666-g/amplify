import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UpdateStatusDto, UpdateRoleDto } from './dto/users.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('organizationId') organizationId?: string,
    @Query('role') role?: 'super_admin' | 'admin' | 'user',
    @Query('status') status?: string,
    @Query('q') q?: string,
  ) {
    return this.usersService.findAll(user, { organizationId, role, status, q });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.usersService.findByIdPublic(id, user);
  }

  @Post()
  create(@Body() body: CreateUserDto, @CurrentUser() user: AuthUser) {
    return this.usersService.createUser(body, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateUserDto, @CurrentUser() user: AuthUser) {
    if (id === user.userId) {
      throw new BadRequestException('Use the profile page to update your own account');
    }
    return this.usersService.updateUser(id, body, user);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (id === user.userId) {
      throw new BadRequestException('Cannot change your own status');
    }
    return this.usersService.updateStatus(id, body.status, user);
  }

  @Patch(':id/role')
  updateRole(@Param('id') id: string, @Body() body: UpdateRoleDto, @CurrentUser() user: AuthUser) {
    if (id === user.userId) {
      throw new BadRequestException('Cannot change your own role');
    }
    return this.usersService.updateRole(id, body.role, user, body.organizationId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (id === user.userId) {
      throw new BadRequestException('Cannot delete your own account');
    }
    return this.usersService.deleteUser(id, user);
  }
}
