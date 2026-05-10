import { Injectable, BadGatewayException, RequestTimeoutException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic, { APIConnectionTimeoutError, APIError } from '@anthropic-ai/sdk';
import type { Message, ContentBlock } from '@anthropic-ai/sdk/resources/messages';
import type { ReasoningEffort } from './azure-openai.service';

// Anthropic extended thinking budget tokens mapped from ReasoningEffort
const THINKING_BUDGET: Record<Exclude<ReasoningEffort, 'none'>, number> = {
  low: 2048,
  medium: 8192,
  high: 16000,
  xhigh: 32000,
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
    return parseInt(this.config.get<string>('AZURE_OPENAI_TIMEOUT_MS', '120000'), 10);
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

  async chat(model: string, prompt: string, reasoningEffort: ReasoningEffort = 'medium'): Promise<string> {
    if (!this.isConfigured()) {
      throw new BadGatewayException('Anthropic is not configured');
    }
    try {
      const client = this.createClient();
      let response: Message;

      if (reasoningEffort !== 'none') {
        // Use extended thinking when reasoning is requested
        const budgetTokens = THINKING_BUDGET[reasoningEffort];
        response = await client.messages.create({
          model,
          max_tokens: budgetTokens + 8192,
          thinking: { type: 'enabled', budget_tokens: budgetTokens },
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        }) as Message;
      } else {
        response = await client.messages.create({
          model,
          max_tokens: 8192,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        }) as Message;
      }

      return this.extractText(response.content);
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
