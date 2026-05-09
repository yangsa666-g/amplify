import { Injectable, BadGatewayException, RequestTimeoutException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AiFoundryService {
  constructor(private config: ConfigService) {}

  private get baseUrl() {
    return this.config.get<string>('AI_FOUNDRY_API_URL', '');
  }

  private get apiKey() {
    return this.config.get<string>('AI_FOUNDRY_API_KEY', '');
  }

  private get timeoutMs() {
    return parseInt(this.config.get<string>('AI_FOUNDRY_TIMEOUT_MS', '120000'), 10);
  }

  async chat(model: string, prompt: string): Promise<string> {
    if (!this.baseUrl || !this.apiKey) {
      throw new BadGatewayException('AI Foundry is not configured');
    }
    try {
      const response = await axios.post(
        `${this.baseUrl}/openai/deployments/${model}/chat/completions?api-version=2024-02-01`,
        {
          messages: [{ role: 'user', content: prompt }],
          temperature: 0,
        },
        {
          headers: {
            'api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: this.timeoutMs,
        },
      );
      return response.data?.choices?.[0]?.message?.content ?? '';
    } catch (err: any) {
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        throw new RequestTimeoutException('AI Foundry request timed out');
      }
      const status = err.response?.status;
      const message = err.response?.data?.error?.message || err.message;
      throw new BadGatewayException(`AI Foundry error (${status}): ${message}`);
    }
  }
}
