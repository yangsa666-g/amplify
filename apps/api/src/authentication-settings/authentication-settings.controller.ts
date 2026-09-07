import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticationSettingsService } from './authentication-settings.service';
import { UpdateAuthenticationSettingsDto } from './dto/authentication-settings.dto';

@Controller('admin/settings/authentication')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class AuthenticationSettingsController {
  constructor(private readonly settings: AuthenticationSettingsService) {}

  @Get()
  getConfiguration() {
    return this.settings.getConfiguration();
  }

  @Patch()
  updateConfiguration(@Body() body: UpdateAuthenticationSettingsDto) {
    return this.settings.updateConfiguration(body.localAuthEnabled);
  }
}
