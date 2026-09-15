import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import type { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';
import type { AuthenticationSettingsService } from '../authentication-settings/authentication-settings.service';

const superAdminActor: AuthUser = {
  userId: 'super-admin-actor',
  email: 'super-admin@example.com',
  name: 'Super Admin',
  role: 'super_admin',
  authProvider: 'local',
  status: 'active',
  organizationId: null,
};

const organizationAdminActor: AuthUser = {
  userId: 'organization-admin-actor',
  email: 'organization-admin@example.com',
  name: 'Organization Admin',
  role: 'admin',
  authProvider: 'local',
  status: 'active',
  organizationId: 'org-1',
};

type TargetUser = {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'user';
  status: 'active' | 'disabled';
  organizationId: string | null;
};

function makeService(targetUser: TargetUser, remainingPrivilegedUsers = 1) {
  const prisma = {
    user: {
      findUnique: vi.fn().mockResolvedValue(targetUser),
      update: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          ...targetUser,
          ...data,
        }),
      ),
      delete: vi.fn().mockResolvedValue(targetUser),
      count: vi.fn().mockResolvedValue(remainingPrivilegedUsers),
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
  };
}

describe('UsersService role and access scope transitions', () => {
  it('hard deletes a user instead of disabling the account', async () => {
    const targetUser: TargetUser = {
      id: 'user-target',
      email: 'target@example.com',
      name: 'Target',
      role: 'user',
      status: 'active',
      organizationId: 'org-1',
    };
    const { service, prisma } = makeService(targetUser);

    await service.deleteUser(targetUser.id, superAdminActor);

    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: targetUser.id } });
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.refreshToken.deleteMany).not.toHaveBeenCalled();
  });

  it('demotes a Super Admin only when a target Organization is supplied', async () => {
    const targetUser: TargetUser = {
      id: 'super-admin-target',
      email: 'target@example.com',
      name: 'Target',
      role: 'super_admin',
      status: 'active',
      organizationId: null,
    };
    const { service, prisma } = makeService(targetUser);

    await service.updateUser(
      targetUser.id,
      { role: 'user', organizationId: 'org-2' },
      superAdminActor,
    );

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: targetUser.id },
        data: { role: 'user', organizationId: 'org-2' },
      }),
    );
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: targetUser.id },
    });
  });

  it('rejects a Super Admin demotion without an Organization', async () => {
    const targetUser: TargetUser = {
      id: 'super-admin-target',
      email: 'target@example.com',
      name: 'Target',
      role: 'super_admin',
      status: 'active',
      organizationId: null,
    };
    const { service, prisma } = makeService(targetUser);

    await expect(
      service.updateUser(targetUser.id, { role: 'admin', organizationId: null }, superAdminActor),
    ).rejects.toThrow('Organization is required');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('promotes an Organization user to Super Admin and clears their Organization', async () => {
    const targetUser: TargetUser = {
      id: 'user-target',
      email: 'target@example.com',
      name: 'Target',
      role: 'user',
      status: 'active',
      organizationId: 'org-1',
    };
    const { service, prisma } = makeService(targetUser);

    await service.updateUser(
      targetUser.id,
      { role: 'super_admin', organizationId: 'org-1' },
      superAdminActor,
    );

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { role: 'super_admin', organizationId: null },
      }),
    );
  });

  it('protects the final active Super Admin from demotion', async () => {
    const targetUser: TargetUser = {
      id: 'super-admin-target',
      email: 'target@example.com',
      name: 'Target',
      role: 'super_admin',
      status: 'active',
      organizationId: null,
    };
    const { service, prisma } = makeService(targetUser, 0);

    await expect(
      service.updateUser(targetUser.id, { role: 'user', organizationId: 'org-2' }, superAdminActor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('protects the final active Super Admin from being disabled', async () => {
    const targetUser: TargetUser = {
      id: 'super-admin-target',
      email: 'target@example.com',
      name: 'Target',
      role: 'super_admin',
      status: 'active',
      organizationId: null,
    };
    const { service, prisma } = makeService(targetUser, 0);

    await expect(
      service.updateStatus(targetUser.id, 'disabled', superAdminActor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('protects the final active Organization Admin when moving Organizations', async () => {
    const targetUser: TargetUser = {
      id: 'admin-target',
      email: 'target@example.com',
      name: 'Target',
      role: 'admin',
      status: 'active',
      organizationId: 'org-1',
    };
    const { service, prisma } = makeService(targetUser, 0);

    await expect(
      service.updateUser(
        targetUser.id,
        { role: 'admin', organizationId: 'org-2' },
        superAdminActor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('does not allow an Organization Admin to promote users to Super Admin', async () => {
    const targetUser: TargetUser = {
      id: 'user-target',
      email: 'target@example.com',
      name: 'Target',
      role: 'user',
      status: 'active',
      organizationId: 'org-1',
    };
    const { service, prisma } = makeService(targetUser);

    await expect(
      service.updateUser(
        targetUser.id,
        { role: 'super_admin', organizationId: null },
        organizationAdminActor,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
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
    return {
      service: new UsersService(
        prisma as unknown as PrismaService,
        authenticationSettings as unknown as AuthenticationSettingsService,
      ),
      prisma,
    };
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
      superAdminActor,
    );

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ authProvider: 'entra', passwordHash: null }),
      }),
    );
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
        superAdminActor,
      ),
    ).rejects.toThrow('Local authentication is disabled');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
