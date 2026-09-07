import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { AuthenticationSettingsService } from './authentication-settings.service';

describe('AuthenticationSettingsService', () => {
  it('defaults local authentication to enabled when no setting exists', async () => {
    const prisma = {
      authenticationSetting: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    const service = new AuthenticationSettingsService(prisma as unknown as PrismaService);

    await expect(service.getConfiguration()).resolves.toEqual({ localAuthEnabled: true });
  });

  it('revokes local refresh sessions when local authentication is disabled', async () => {
    const tx = {
      authenticationSetting: {
        upsert: vi.fn().mockResolvedValue({ localAuthEnabled: false }),
      },
      refreshToken: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
    };
    const prisma = {
      $transaction: vi.fn().mockImplementation((callback) => callback(tx)),
    };
    const service = new AuthenticationSettingsService(prisma as unknown as PrismaService);

    await expect(service.updateConfiguration(false)).resolves.toEqual({
      localAuthEnabled: false,
    });
    expect(tx.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { user: { authProvider: 'local' } },
    });
  });
});
