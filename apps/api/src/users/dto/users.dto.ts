import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsIn,
  MinLength,
  MaxLength,
} from 'class-validator';

export type UserRoleInput = 'super_admin' | 'admin' | 'user';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  @MinLength(8)
  @MaxLength(200)
  password?: string;

  @IsOptional()
  @IsIn(['admin', 'user', 'super_admin'])
  role?: UserRoleInput;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsIn(['local', 'entra'])
  authProvider?: 'local' | 'entra';
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

export class UpdateStatusDto {
  @IsIn(['active', 'disabled'])
  status!: 'active' | 'disabled';
}

export class UpdateRoleDto {
  @IsIn(['admin', 'user', 'super_admin'])
  role!: UserRoleInput;

  @IsOptional()
  @IsString()
  organizationId?: string | null;
}
