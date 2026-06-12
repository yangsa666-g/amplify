import { describe, expect, it } from 'vitest';
import { buildModelCatalogEntry, inferModelProvider } from './model-registry';

describe('model registry', () => {
  it('infers common model providers from model names', () => {
    expect(inferModelProvider('gpt-5.4')).toBe('openai');
    expect(inferModelProvider('o3-mini')).toBe('openai');
    expect(inferModelProvider('claude-sonnet-4-5')).toBe('claude');
  });

  it('builds catalog entries with provider capabilities', () => {
    expect(buildModelCatalogEntry('claude-sonnet-4-5', 'claude')).toMatchObject({
      name: 'claude-sonnet-4-5',
      provider: 'claude',
      icon: 'claude',
      supportsReasoning: true,
      defaultReasoningEffort: 'medium',
      reasoningEfforts: ['none', 'low', 'medium', 'high', 'xhigh'],
    });
  });
});
