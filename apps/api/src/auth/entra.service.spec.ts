import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import type { UsersService } from '../users/users.service';
import { EntraService } from './entra.service';

type EntraProvisioner = {
  provisionUser(input: { oid: string; email: string; name: string }): Promise<unknown>;
};

describe('EntraService pre-provisioned authentication method', () => {
  it('does not convert a local account into an Entra SSO account', async () => {
    const config = { get: vi.fn().mockReturnValue(undefined) };
    const users = {
      findByEntraOid: vi.fn().mockResolvedValue(null),
      findByEmail: vi.fn().mockResolvedValue({
        id: 'local-user',
        email: 'local@example.com',
        authProvider: 'local',
      }),
      linkEntraOid: vi.fn(),
    };
    const service = new EntraService(
      config as unknown as ConfigService,
      users as unknown as UsersService,
    );

    await expect(
      (service as unknown as EntraProvisioner).provisionUser({
        oid: 'entra-oid',
        email: 'local@example.com',
        name: 'Local User',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(users.linkEntraOid).not.toHaveBeenCalled();
  });
});
