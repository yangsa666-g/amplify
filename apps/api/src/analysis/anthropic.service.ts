import { Injectable, BadGatewayException, RequestTimeoutException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic, { APIConnectionTimeoutError, APIError } from '@anthropic-ai/sdk';
import type { Message, ContentBlock } from '@anthropic-ai/sdk/resources/messages';
import type { ReasoningEffort } from '../models/model-registry';
import { fromAnthropicUsage, type AiChatResult } from './token-usage';

// Response cap per effort level. Adaptive thinking decides its own internal
// budget; we just need max_tokens large enough to fit reasoning + the
// long-form contract analysis the API returns at each effort level.
const MAX_TOKENS: Record<Exclude<ReasoningEffort, 'none'>, number> = {
  low: 10240,
  medium: 16384,
  high: 24192,
  xhigh: 40192,
};

@Injectable()
export class AnthropicService {
  constructor(private config: ConfigService) {}

  private get endpoint() {
    return this.config.get<string>('ANTHROPIC_ENDPOINT', '');
  }

  private get apiKey() {
    return this.config.get<string>('ANTHROPIC_API_KEY', '');
  }

  private get timeoutMs() {
    return parseInt(this.config.get<string>('AZURE_OPENAI_TIMEOUT_MS', '300000'), 10);
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  private createClient(): Anthropic {
    const endpoint = this.endpoint;
    // Custom endpoint (e.g. Azure AI Foundry) requires Bearer token auth.
    // Standard api.anthropic.com uses x-api-key via apiKey.
    if (endpoint) {
      return new Anthropic({
        baseURL: endpoint,
        authToken: this.apiKey,
        timeout: this.timeoutMs,
        maxRetries: 0,
      });
    }
    return new Anthropic({
      apiKey: this.apiKey,
      timeout: this.timeoutMs,
      maxRetries: 0,
    });
  }

  private extractText(content: ContentBlock[]): string {
    const block = content.find((b) => b.type === 'text');
    return block?.type === 'text' ? block.text : '';
  }

  async chat(
    model: string,
    prompt: string,
    reasoningEffort: ReasoningEffort = 'medium',
  ): Promise<AiChatResult> {
    if (!this.isConfigured()) {
      throw new BadGatewayException('Anthropic is not configured');
    }
    try {
      const client = this.createClient();
      let response: Message;

      if (reasoningEffort !== 'none') {
        // Newer Claude models (opus 4.6+, 4.7+) reject the legacy
        // `thinking.type=enabled` form with HTTP 400. Use adaptive thinking
        // plus `output_config.effort` — the path the API now requires, and
        // which the SDK also recommends for older thinking-capable models.
        response = (await client.messages.create({
          model,
          max_tokens: MAX_TOKENS[reasoningEffort],
          thinking: { type: 'adaptive' },
          output_config: { effort: reasoningEffort },
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        })) as Message;
      } else {
        response = (await client.messages.create({
          model,
          max_tokens: 8192,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        })) as Message;
      }

      return {
        text: this.extractText(response.content),
        usage: fromAnthropicUsage(response.usage),
      };
    } catch (err: unknown) {
      if (err instanceof APIConnectionTimeoutError) {
        throw new RequestTimeoutException('Anthropic request timed out');
      }
      if (err instanceof APIError) {
        throw new BadGatewayException(`Anthropic error (${err.status}): ${err.message}`);
      }
      throw new BadGatewayException('Anthropic unexpected error');
    }
  }
}
