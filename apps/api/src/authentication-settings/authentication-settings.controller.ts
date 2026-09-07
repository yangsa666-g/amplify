import { Body, Controller, ForbiddenException, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticationSettingsService } from './authentication-settings.service';
import { UpdateAuthenticationSettingsDto } from './dto/authentication-settings.dto';

@Controller('admin/settings/authentication')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthenticationSettingsController {
  constructor(private readonly settings: AuthenticationSettingsService) {}

  @Get()
  @Roles('admin')
  getConfiguration() {
    return this.settings.getConfiguration();
  }

  @Patch()
  @Roles('super_admin')
  updateConfiguration(
    @Body() body: UpdateAuthenticationSettingsDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (user.selectedOrganizationId) {
      throw new ForbiddenException(
        'Organization authentication settings are inherited from Platform',
      );
    }
    return this.settings.updateConfiguration(body.localAuthEnabled);
  }
}
