import { Injectable, BadGatewayException, RequestTimeoutException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AzureOpenAI, APIConnectionTimeoutError, APIError } from 'openai';
import type { ReasoningEffort } from '../models/model-registry';

const DEFAULT_REASONING_EFFORT: ReasoningEffort = 'medium';
const DEFAULT_API_VERSION = '2025-03-01-preview';

@Injectable()
export class AzureOpenAIService {
  constructor(private config: ConfigService) {}

  private get endpoint() {
    return this.config.get<string>('AZURE_OPENAI_ENDPOINT', '');
  }

  private get apiKey() {
    return this.config.get<string>('AZURE_OPENAI_API_KEY', '');
  }

  private get timeoutMs() {
    return parseInt(this.config.get<string>('AZURE_OPENAI_TIMEOUT_MS', '300000'), 10);
  }

  private get apiVersion() {
    return this.config.get<string>('AZURE_OPENAI_API_VERSION', DEFAULT_API_VERSION);
  }

  private createClient(): AzureOpenAI {
    return new AzureOpenAI({
      endpoint: this.endpoint,
      apiKey: this.apiKey,
      apiVersion: this.apiVersion,
      timeout: this.timeoutMs,
    });
  }

  private mapReasoningEffort(effort: ReasoningEffort): 'low' | 'medium' | 'high' | null {
    if (effort === 'none') return null;
    if (effort === 'xhigh') return 'high';
    return effort;
  }

  async chat(
    model: string,
    prompt: string,
    reasoningEffort: ReasoningEffort = DEFAULT_REASONING_EFFORT,
  ): Promise<string> {
    if (!this.endpoint || !this.apiKey) {
      throw new BadGatewayException('Azure OpenAI is not configured');
    }
    try {
      const client = this.createClient();
      const mappedEffort = this.mapReasoningEffort(reasoningEffort);
      const response = await client.responses.create({
        model,
        input: prompt,
        ...(mappedEffort ? { reasoning: { effort: mappedEffort } } : {}),
      });
      return response.output_text ?? '';
    } catch (err: unknown) {
      if (err instanceof APIConnectionTimeoutError) {
        throw new RequestTimeoutException('Azure OpenAI request timed out');
      }
      if (err instanceof APIError) {
        throw new BadGatewayException(`Azure OpenAI error (${err.status}): ${err.message}`);
      }
      throw new BadGatewayException('Azure OpenAI unexpected error');
    }
  }
}
