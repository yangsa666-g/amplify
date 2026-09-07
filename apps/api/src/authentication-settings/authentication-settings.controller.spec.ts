import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticationSettingsService } from './authentication-settings.service';
import { AuthenticationSettingsController } from './authentication-settings.controller';

const platformSuperAdmin: AuthUser = {
  userId: 'super-admin',
  email: 'super-admin@example.com',
  name: 'Super Admin',
  role: 'super_admin',
  authProvider: 'local',
  status: 'active',
  organizationId: null,
  selectedOrganizationId: null,
};

describe('AuthenticationSettingsController permissions', () => {
  it('allows Admins to read but only Super Admins to update', () => {
    expect(
      Reflect.getMetadata('roles', AuthenticationSettingsController.prototype.getConfiguration),
    ).toEqual(['admin']);
    expect(
      Reflect.getMetadata('roles', AuthenticationSettingsController.prototype.updateConfiguration),
    ).toEqual(['super_admin']);
  });

  it('updates the Platform setting in Platform context', async () => {
    const settings = {
      updateConfiguration: vi.fn().mockResolvedValue({ localAuthEnabled: false }),
    };
    const controller = new AuthenticationSettingsController(
      settings as unknown as AuthenticationSettingsService,
    );

    await expect(
      controller.updateConfiguration({ localAuthEnabled: false }, platformSuperAdmin),
    ).resolves.toEqual({ localAuthEnabled: false });
  });

  it('rejects organization-level overrides, including from a Super Admin', () => {
    const settings = { updateConfiguration: vi.fn() };
    const controller = new AuthenticationSettingsController(
      settings as unknown as AuthenticationSettingsService,
    );

    expect(() =>
      controller.updateConfiguration(
        { localAuthEnabled: false },
        { ...platformSuperAdmin, selectedOrganizationId: 'org-1' },
      ),
    ).toThrow(ForbiddenException);
    expect(settings.updateConfiguration).not.toHaveBeenCalled();
  });
});
