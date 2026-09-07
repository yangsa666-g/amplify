import {
  IsEmail,
  IsDefined,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FirstAdminDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password?: string;

  @IsIn(['local', 'entra'])
  authProvider!: 'local' | 'entra';
}

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => FirstAdminDto)
  firstAdmin!: FirstAdminDto;
}

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;
}

export class UpdateOrganizationStatusDto {
  @IsIn(['active', 'disabled'])
  status!: 'active' | 'disabled';
}
