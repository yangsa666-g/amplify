import { BadGatewayException, Injectable, RequestTimeoutException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI, { APIConnectionTimeoutError, APIError } from 'openai';
import type { OpenAICompatibleConnection, ReasoningEffort } from './model-registry';

@Injectable()
export class OpenAICompatibleService {
  constructor(private config: ConfigService) {}

  async chat(
    connection: OpenAICompatibleConnection,
    prompt: string,
    reasoningEffort: ReasoningEffort,
  ): Promise<string> {
    const client = new OpenAI({
      baseURL: connection.endpoint.replace(/\/+$/, ''),
      apiKey: connection.apiKey,
      timeout: parseInt(this.config.get<string>('AZURE_OPENAI_TIMEOUT_MS', '300000'), 10),
    });

    try {
      if (connection.apiProtocol === 'responses') {
        const response = await client.responses.create({
          model: connection.upstreamModelName,
          input: prompt,
          ...(connection.supportsReasoning && reasoningEffort !== 'none'
            ? { reasoning: { effort: reasoningEffort } }
            : {}),
        });
        return response.output_text ?? '';
      }

      const response = await client.chat.completions.create({
        model: connection.upstreamModelName,
        messages: [{ role: 'user', content: prompt }],
        ...(connection.supportsReasoning && reasoningEffort !== 'none'
          ? { reasoning_effort: reasoningEffort }
          : {}),
      });
      return response.choices[0]?.message.content ?? '';
    } catch (error: unknown) {
      if (error instanceof APIConnectionTimeoutError) {
        throw new RequestTimeoutException('OpenAI-compatible request timed out');
      }
      if (error instanceof APIError) {
        throw new BadGatewayException(
          `OpenAI-compatible error (${error.status}): ${error.message}`,
        );
      }
      throw new BadGatewayException('OpenAI-compatible unexpected error');
    }
  }
}
