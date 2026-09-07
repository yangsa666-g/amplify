import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { PromptTemplatesService } from './prompt-templates.service';
import type { AuthUser } from '../auth/decorators/current-user.decorator';

const authUser: AuthUser = {
  userId: 'user-1',
  email: 'user@example.com',
  name: 'User One',
  role: 'user',
  authProvider: 'local',
  status: 'active',
  organizationId: 'org-1',
  selectedOrganizationId: 'org-1',
};

function makeService() {
  const prisma = {
    promptTemplate: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  return { service: new PromptTemplatesService(prisma as any), prisma };
}

describe('PromptTemplatesService template types', () => {
  it('isolates user template lists by type', async () => {
    const { service, prisma } = makeService();

    await service.listForUser(authUser, 'contract_comparison');

    expect(prisma.promptTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          templateType: 'contract_comparison',
          OR: expect.arrayContaining([
            { scope: 'platform' },
            { scope: 'organization', organizationId: 'org-1' },
            { scope: 'personal', organizationId: 'org-1', userId: 'user-1' },
          ]),
        }),
      }),
    );
  });

  it('keeps the type when duplicating a system template', async () => {
    const { service, prisma } = makeService();
    prisma.promptTemplate.findUnique.mockResolvedValue({
      id: 'prompt-1',
      name: 'Compare',
      content: 'Compare documents',
      templateType: 'contract_comparison',
      isSystem: true,
      scope: 'platform',
    });
    prisma.promptTemplate.create.mockResolvedValue({ id: 'copy-1' });

    await service.duplicateSystemTemplate(authUser, 'prompt-1');

    expect(prisma.promptTemplate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        templateType: 'contract_comparison',
        organizationId: 'org-1',
        scope: 'personal',
      }),
    });
  });

  it('does not set a template as default for another category', async () => {
    const { service, prisma } = makeService();
    prisma.promptTemplate.findUnique.mockResolvedValue({
      id: 'risk-1',
      templateType: 'risk_analysis',
      isSystem: true,
      scope: 'platform',
    });

    await expect(
      service.setSystemDefault(
        { ...authUser, role: 'super_admin', selectedOrganizationId: null },
        'risk-1',
        'contract_comparison',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.promptTemplate.updateMany).not.toHaveBeenCalled();
  });
});
