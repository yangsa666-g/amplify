import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuthenticationSettingsModule } from '../authentication-settings/authentication-settings.module';

@Module({
  imports: [AuthenticationSettingsModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
