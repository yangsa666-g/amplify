import { IsBoolean } from 'class-validator';

export class UpdateAuthenticationSettingsDto {
  @IsBoolean()
  localAuthEnabled!: boolean;
}
