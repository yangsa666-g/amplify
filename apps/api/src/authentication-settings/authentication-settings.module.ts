import { Module } from '@nestjs/common';
import { AuthenticationSettingsController } from './authentication-settings.controller';
import { AuthenticationSettingsService } from './authentication-settings.service';

@Module({
  controllers: [AuthenticationSettingsController],
  providers: [AuthenticationSettingsService],
  exports: [AuthenticationSettingsService],
})
export class AuthenticationSettingsModule {}
