import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../auth/decorators/current-user.decorator';
import { ApiKeyService } from './api-key.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@Controller('admin/api-keys')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ApiKeyController {
  constructor(private apiKeyService: ApiKeyService) {}

  @Get()
  getCurrent() {
    return this.apiKeyService.getCurrent();
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: CreateApiKeyDto) {
    return this.apiKeyService.create(user.userId, body.expiry ?? '1m');
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.apiKeyService.delete(id);
  }
}
