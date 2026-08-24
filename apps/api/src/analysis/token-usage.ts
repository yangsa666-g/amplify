export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens?: number;
  reasoningTokens?: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
}

export interface AiChatResult {
  text: string;
  usage: TokenUsage | null;
}

export function fromOpenAIUsage(
  usage:
    | {
        input_tokens: number;
        output_tokens: number;
        total_tokens: number;
        input_tokens_details?: { cached_tokens?: number } | null;
        output_tokens_details?: { reasoning_tokens?: number } | null;
      }
    | null
    | undefined,
): TokenUsage | null {
  if (!usage) return null;
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    totalTokens: usage.total_tokens,
    cachedInputTokens: usage.input_tokens_details?.cached_tokens,
    reasoningTokens: usage.output_tokens_details?.reasoning_tokens,
  };
}

export function fromAnthropicUsage(usage: {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}): TokenUsage {
  const cacheCreationInputTokens = usage.cache_creation_input_tokens ?? 0;
  const cacheReadInputTokens = usage.cache_read_input_tokens ?? 0;
  const inputTokens = usage.input_tokens + cacheCreationInputTokens + cacheReadInputTokens;
  return {
    inputTokens,
    outputTokens: usage.output_tokens,
    totalTokens: inputTokens + usage.output_tokens,
    cacheCreationInputTokens,
    cacheReadInputTokens,
  };
}

const OPTIONAL_USAGE_KEYS = [
  'cachedInputTokens',
  'reasoningTokens',
  'cacheCreationInputTokens',
  'cacheReadInputTokens',
] as const;

export function aggregateTokenUsage(
  usages: Array<TokenUsage | null | undefined>,
): TokenUsage | null {
  const available = usages.filter((usage): usage is TokenUsage => !!usage);
  if (available.length === 0) return null;

  const result: TokenUsage = {
    inputTokens: available.reduce((sum, usage) => sum + usage.inputTokens, 0),
    outputTokens: available.reduce((sum, usage) => sum + usage.outputTokens, 0),
    totalTokens: available.reduce((sum, usage) => sum + usage.totalTokens, 0),
  };

  for (const key of OPTIONAL_USAGE_KEYS) {
    if (available.some((usage) => usage[key] !== undefined)) {
      result[key] = available.reduce((sum, usage) => sum + (usage[key] ?? 0), 0);
    }
  }

  return result;
}
