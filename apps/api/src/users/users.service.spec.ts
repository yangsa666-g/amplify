import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import type { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';
import type { AuthenticationSettingsService } from '../authentication-settings/authentication-settings.service';

const superAdmin: AuthUser = {
  userId: 'super-admin-1',
  email: 'super-admin@example.com',
  name: 'Super Admin',
  role: 'super_admin',
  authProvider: 'local',
  status: 'active',
  organizationId: null,
};

const organizationAdmin: AuthUser = {
  userId: 'admin-1',
  email: 'admin@example.com',
  name: 'Organization Admin',
  role: 'admin',
  authProvider: 'local',
  status: 'active',
  organizationId: 'org-1',
};

function makeService(role: 'admin' | 'user' = 'user', remainingAdminCount = 1) {
  const user = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'User',
    role,
    status: 'active',
    organizationId: 'org-1',
  };
  const prisma = {
    user: {
      findUnique: vi.fn().mockResolvedValue(user),
      update: vi.fn().mockResolvedValue({ ...user, organizationId: 'org-2' }),
      count: vi.fn().mockResolvedValue(remainingAdminCount),
    },
    organization: {
      findUnique: vi.fn().mockResolvedValue({ id: 'org-2', status: 'active' }),
    },
    refreshToken: {
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const authenticationSettings = {
    isLocalAuthEnabled: vi.fn().mockResolvedValue(true),
  };

  return {
    service: new UsersService(
      prisma as unknown as PrismaService,
      authenticationSettings as unknown as AuthenticationSettingsService,
    ),
    prisma,
    authenticationSettings,
  };
}

describe('UsersService organization changes', () => {
  it('allows a Super Admin to move a user and revokes existing sessions', async () => {
    const { service, prisma } = makeService();

    await service.updateUser('user-1', { organizationId: 'org-2' }, superAdmin);

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { organizationId: 'org-2' },
      }),
    );
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
  });

  it('does not allow an Organization Admin to move a user', async () => {
    const { service, prisma } = makeService();

    await expect(
      service.updateUser('user-1', { organizationId: 'org-2' }, organizationAdmin),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('does not move the last active Admin out of an organization', async () => {
    const { service, prisma } = makeService('admin', 0);

    await expect(
      service.updateUser('user-1', { organizationId: 'org-2' }, superAdmin),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('UsersService authentication method', () => {
  function makeCreateService(localAuthEnabled = true) {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve(data)),
      },
      organization: {
        findUnique: vi.fn().mockResolvedValue({ id: 'org-1', status: 'active' }),
      },
    };
    const authenticationSettings = {
      isLocalAuthEnabled: vi.fn().mockResolvedValue(localAuthEnabled),
    };
    const service = new UsersService(
      prisma as unknown as PrismaService,
      authenticationSettings as unknown as AuthenticationSettingsService,
    );
    return { service, prisma };
  }

  it('creates an Entra SSO user without storing a password', async () => {
    const { service, prisma } = makeCreateService();

    await service.createUser(
      {
        name: 'SSO User',
        email: 'sso@example.com',
        password: 'must-not-be-stored',
        role: 'user',
        organizationId: 'org-1',
        authProvider: 'entra',
      },
      superAdmin,
    );

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ authProvider: 'entra', passwordHash: null }),
      }),
    );
  });

  it('requires an initial password for a local user', async () => {
    const { service, prisma } = makeCreateService();

    await expect(
      service.createUser(
        {
          name: 'Local User',
          email: 'local@example.com',
          role: 'user',
          organizationId: 'org-1',
          authProvider: 'local',
        },
        superAdmin,
      ),
    ).rejects.toThrow('Password is required for local users');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects local-user creation when local authentication is disabled', async () => {
    const { service, prisma } = makeCreateService(false);

    await expect(
      service.createUser(
        {
          name: 'Local User',
          email: 'local@example.com',
          password: 'password123',
          role: 'user',
          organizationId: 'org-1',
          authProvider: 'local',
        },
        superAdmin,
      ),
    ).rejects.toThrow('Local authentication is disabled');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
