import { ForbiddenException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { describe, expect, it, vi } from 'vitest';
import type { AuthenticationSettingsService } from '../authentication-settings/authentication-settings.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService local authentication setting', () => {
  it('rejects password validation before looking up a user when local auth is disabled', async () => {
    const users = { findByEmail: vi.fn() };
    const authenticationSettings = {
      isLocalAuthEnabled: vi.fn().mockResolvedValue(false),
    };
    const service = new AuthService(
      users as unknown as UsersService,
      {} as JwtService,
      {} as ConfigService,
      {} as PrismaService,
      authenticationSettings as unknown as AuthenticationSettingsService,
    );

    await expect(service.validateUser('local@example.com', 'password123')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(users.findByEmail).not.toHaveBeenCalled();
  });
});
