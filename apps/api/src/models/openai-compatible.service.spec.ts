import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';

const mocks = vi.hoisted(() => ({
  responsesCreate: vi.fn(),
  chatCreate: vi.fn(),
}));

vi.mock('openai', () => ({
  default: class MockOpenAI {
    responses = { create: mocks.responsesCreate };
    chat = { completions: { create: mocks.chatCreate } };
  },
  APIConnectionTimeoutError: class APIConnectionTimeoutError extends Error {},
  APIError: class APIError extends Error {},
}));

import { OpenAICompatibleService } from './openai-compatible.service';

const config = {
  endpoint: 'https://example.test/v1',
  apiKey: 'secret',
  upstreamModelName: 'model-a',
  supportsReasoning: true,
} as const;

describe('OpenAICompatibleService', () => {
  const service = new OpenAICompatibleService({
    get: (_name: string, fallback: string) => fallback,
  } as ConfigService);

  beforeEach(() => vi.clearAllMocks());

  it('calls Chat Completions and includes enabled reasoning effort', async () => {
    mocks.chatCreate.mockResolvedValue({ choices: [{ message: { content: 'chat result' } }] });
    await expect(
      service.chat({ ...config, apiProtocol: 'chat_completions' }, 'hello', 'high'),
    ).resolves.toEqual({ text: 'chat result', usage: null });
    expect(mocks.chatCreate).toHaveBeenCalledWith({
      model: 'model-a',
      messages: [{ role: 'user', content: 'hello' }],
      reasoning_effort: 'high',
    });
  });

  it('calls Responses and omits disabled reasoning effort', async () => {
    mocks.responsesCreate.mockResolvedValue({ output_text: 'response result' });
    await expect(
      service.chat(
        { ...config, apiProtocol: 'responses', supportsReasoning: false },
        'hello',
        'high',
      ),
    ).resolves.toEqual({ text: 'response result', usage: null });
    expect(mocks.responsesCreate).toHaveBeenCalledWith({ model: 'model-a', input: 'hello' });
  });

  it('omits the reasoning parameter when effort is none', async () => {
    mocks.chatCreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] });
    await service.chat({ ...config, apiProtocol: 'chat_completions' }, 'hello', 'none');
    expect(mocks.chatCreate).toHaveBeenCalledWith({
      model: 'model-a',
      messages: [{ role: 'user', content: 'hello' }],
    });
  });
});
