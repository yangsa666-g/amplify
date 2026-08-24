import { describe, expect, it } from 'vitest';
import { aggregateTokenUsage, fromAnthropicUsage, fromOpenAIUsage } from './token-usage';

describe('token usage normalization', () => {
  it('normalizes OpenAI usage and preserves cache/reasoning details', () => {
    expect(
      fromOpenAIUsage({
        input_tokens: 100,
        output_tokens: 40,
        total_tokens: 140,
        input_tokens_details: { cached_tokens: 25 },
        output_tokens_details: { reasoning_tokens: 10 },
      }),
    ).toEqual({
      inputTokens: 100,
      outputTokens: 40,
      totalTokens: 140,
      cachedInputTokens: 25,
      reasoningTokens: 10,
    });
  });

  it('includes Anthropic cache tokens in the total input count', () => {
    expect(
      fromAnthropicUsage({
        input_tokens: 100,
        output_tokens: 40,
        cache_creation_input_tokens: 20,
        cache_read_input_tokens: 30,
      }),
    ).toEqual({
      inputTokens: 150,
      outputTokens: 40,
      totalTokens: 190,
      cacheCreationInputTokens: 20,
      cacheReadInputTokens: 30,
    });
  });

  it('aggregates stages and optional provider details', () => {
    expect(
      aggregateTokenUsage([
        { inputTokens: 10, outputTokens: 5, totalTokens: 15, cachedInputTokens: 2 },
        { inputTokens: 20, outputTokens: 7, totalTokens: 27, reasoningTokens: 3 },
      ]),
    ).toEqual({
      inputTokens: 30,
      outputTokens: 12,
      totalTokens: 42,
      cachedInputTokens: 2,
      reasoningTokens: 3,
    });
  });
});
