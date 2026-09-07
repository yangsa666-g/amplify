import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import type { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

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

  return {
    service: new UsersService(prisma as unknown as PrismaService),
    prisma,
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
