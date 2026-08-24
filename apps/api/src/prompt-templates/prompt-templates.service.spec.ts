import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { PromptTemplatesService } from './prompt-templates.service';

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

    await service.listForUser('user-1', 'contract_comparison');

    expect(prisma.promptTemplate.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { isSystem: true, templateType: 'contract_comparison' },
      }),
    );
    expect(prisma.promptTemplate.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { userId: 'user-1', isSystem: false, templateType: 'contract_comparison' },
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
    });
    prisma.promptTemplate.create.mockResolvedValue({ id: 'copy-1' });

    await service.duplicateSystemTemplate('user-1', 'prompt-1');

    expect(prisma.promptTemplate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ templateType: 'contract_comparison' }),
    });
  });

  it('does not set a template as default for another category', async () => {
    const { service, prisma } = makeService();
    prisma.promptTemplate.findUnique.mockResolvedValue({
      id: 'risk-1',
      templateType: 'risk_analysis',
      isSystem: true,
    });

    await expect(service.setSystemDefault('risk-1', 'contract_comparison')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.promptTemplate.updateMany).not.toHaveBeenCalled();
  });
});
