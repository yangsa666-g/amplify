import { describe, expect, it } from 'vitest';
import { modelIconName } from '../utils/modelIcons';

describe('modelIconName', () => {
  it('uses the upstream model name for custom model aliases', () => {
    expect(modelIconName({ name: 'internal-fast-model', upstreamModelName: 'deepseek-chat' })).toBe(
      'deepseek-chat',
    );
  });

  it('falls back to the model name for environment models', () => {
    expect(modelIconName({ name: 'gpt-4.1', upstreamModelName: undefined })).toBe('gpt-4.1');
  });
});
