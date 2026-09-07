import { describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ModelCredentialsService } from './model-credentials.service';
import { OpenAICompatibleService } from './openai-compatible.service';
import { ModelsService } from './models.service';

function createService(options?: { encryptionConfigured?: boolean }) {
  const customModels = [
    {
      id: 'custom-id',
      organizationId: 'org-1',
      name: 'local-model',
      endpoint: 'https://example.test/v1',
      upstreamModelName: 'upstream-model',
      apiProtocol: 'chat_completions',
      encryptedApiKey: 'encrypted',
      supportsReasoning: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  const prisma = {
    openAICompatibleModel: {
      findMany: vi.fn().mockResolvedValue(customModels),
      findUnique: vi.fn(
        ({
          where,
        }: {
          where: { organizationId_name?: { organizationId: string; name: string } };
        }) =>
          Promise.resolve(
            customModels.find(
              (model) =>
                model.organizationId === where.organizationId_name?.organizationId &&
                model.name === where.organizationId_name?.name,
            ) ?? null,
          ),
      ),
    },
    modelCatalogSetting: { findMany: vi.fn().mockResolvedValue([]) },
    organizationModelSetting: { findMany: vi.fn().mockResolvedValue([]) },
  } as unknown as PrismaService;
  const config = {
    get: (name: string, fallback: string) => {
      if (name === 'AZURE_OPENAI_MODELS') return 'gpt-env';
      if (name === 'ANTHROPIC_MODELS') return 'claude-env';
      return fallback;
    },
  } as ConfigService;
  const credentials = {
    isConfigured: () => options?.encryptionConfigured !== false,
    decrypt: () => 'decrypted-key',
  } as unknown as ModelCredentialsService;
  const compatible = { chat: vi.fn() } as unknown as OpenAICompatibleService;
  return new ModelsService(config, prisma, credentials, compatible);
}

describe('ModelsService catalog', () => {
  it('merges environment and custom models without exposing connection details publicly', async () => {
    const models = await createService().getModels('org-1');
    expect(models.map((model) => model.name)).toEqual(['gpt-env', 'local-model', 'claude-env']);
    expect(models.find((model) => model.name === 'local-model')).not.toHaveProperty('endpoint');
  });

  it('excludes custom models when the encryption key is unavailable', async () => {
    const models = await createService({ encryptionConfigured: false }).getModels('org-1');
    expect(models.map((model) => model.name)).toEqual(['gpt-env', 'claude-env']);
  });

  it('resolves an enabled custom alias to its upstream connection', async () => {
    await expect(
      createService().resolveForExecution('local-model', 'high', 'org-1'),
    ).resolves.toMatchObject({
      source: 'custom',
      modelName: 'local-model',
      upstreamModelName: 'upstream-model',
      apiKey: 'decrypted-key',
      reasoningEffort: 'none',
    });
  });

  it('rejects unknown models before execution', async () => {
    await expect(createService().resolveForExecution('unknown')).rejects.toThrow(
      'Model is not available',
    );
  });
});
