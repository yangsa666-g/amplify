import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { buildComparisonPrompt, CompareService } from './compare.service';
import type { AuthUser } from '../auth/decorators/current-user.decorator';

const resolvedModel = {
  source: 'environment' as const,
  provider: 'openai' as const,
  modelName: 'gpt-test',
  supportsReasoning: true,
  reasoningEffort: 'medium' as const,
};

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

function makeService(documentCount = 2) {
  const records = Array.from({ length: documentCount }, (_, index) => ({
    id: `doc-${index + 1}`,
    fileName: `Contract ${index + 1}.txt`,
    extractedText: `Text ${index + 1}`,
    textExtractionStatus: 'success',
    extractionError: null,
  }));
  const prisma = {
    document: { findMany: vi.fn().mockResolvedValue(records) },
    compareJob: {
      create: vi.fn().mockResolvedValue({ id: 'job-1' }),
      update: vi.fn().mockResolvedValue({}),
    },
  };
  const prompts = {
    getById: vi.fn(),
    getSystemDefault: vi.fn().mockResolvedValue({ id: 'prompt-1', content: 'Compare them.' }),
  };
  const models = { resolveForExecution: vi.fn().mockResolvedValue(resolvedModel) };
  const ai = {
    chat: vi.fn().mockResolvedValue({
      text: '# Result',
      usage: { inputTokens: 100, outputTokens: 20, totalTokens: 120 },
    }),
  };
  return {
    service: new CompareService(prisma as any, prompts as any, models as any, ai as any),
    prisma,
    prompts,
    ai,
  };
}

describe('CompareService', () => {
  it.each([2, 5])('runs AI analysis for %i ordered documents', async (count) => {
    const { service, prisma, ai } = makeService(count);
    const ids = Array.from({ length: count }, (_, index) => `doc-${index + 1}`);
    const result = await service.run(authUser, ids, 'gpt-test');

    expect(result.analysisResult).toBe('# Result');
    expect(result.tokenUsage?.totalTokens).toBe(120);
    expect(prisma.compareJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          documents: { create: ids.map((documentId, sortOrder) => ({ documentId, sortOrder })) },
        }),
      }),
    );
    const prompt = ai.chat.mock.calls[0][1];
    ids.forEach((_, index) => {
      expect(prompt).toContain(`index="${index + 1}"`);
      expect(prompt).toContain(`Text ${index + 1}`);
    });
  });

  it.each([
    [['doc-1'], 'between 2 and 5'],
    [[...Array.from({ length: 6 }, (_, index) => `doc-${index}`)], 'between 2 and 5'],
    [['doc-1', 'doc-1'], 'must be unique'],
  ])('rejects invalid document lists', async (documentIds, message) => {
    const { service } = makeService();
    await expect(service.run(authUser, documentIds, 'gpt-test')).rejects.toThrow(message);
  });

  it('rejects missing or unauthorized documents', async () => {
    const { service, prisma } = makeService(1);
    prisma.document.findMany.mockResolvedValueOnce([]);
    await expect(service.run(authUser, ['doc-1', 'doc-2'], 'gpt-test')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects documents whose text extraction failed', async () => {
    const { service, prisma } = makeService();
    prisma.document.findMany.mockResolvedValueOnce([
      {
        id: 'doc-1',
        fileName: 'One.pdf',
        extractedText: 'Text',
        textExtractionStatus: 'success',
        extractionError: null,
      },
      {
        id: 'doc-2',
        fileName: 'Two.pdf',
        extractedText: null,
        textExtractionStatus: 'failed',
        extractionError: 'OCR failed',
      },
    ]);
    await expect(service.run(authUser, ['doc-1', 'doc-2'], 'gpt-test')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('requires an explicitly selected prompt to be a comparison template', async () => {
    const { service, prompts } = makeService();
    prompts.getById.mockRejectedValueOnce(
      new BadRequestException('Prompt template type does not match this operation'),
    );

    await expect(
      service.run(authUser, ['doc-1', 'doc-2'], 'gpt-test', 'risk-prompt'),
    ).rejects.toThrow('Prompt template type does not match');
    expect(prompts.getById).toHaveBeenCalledWith('risk-prompt', authUser, 'contract_comparison');
  });
});

describe('buildComparisonPrompt', () => {
  it('keeps template instructions and escapes filenames without changing document text', () => {
    const prompt = buildComparisonPrompt('Focus on liability.', [
      { id: 'doc-1', fileName: 'A & "B".txt', extractedText: 'Exact contract text' },
      { id: 'doc-2', fileName: 'C.txt', extractedText: 'Second contract text' },
    ]);
    expect(prompt).toContain('Focus on liability.');
    expect(prompt).toContain('filename="A &amp; &quot;B&quot;.txt"');
    expect(prompt).toContain('Exact contract text');
  });
});
