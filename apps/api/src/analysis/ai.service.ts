import { Injectable } from '@nestjs/common';
import { AzureOpenAIService } from './azure-openai.service';
import { AnthropicService } from './anthropic.service';
import { OpenAICompatibleService } from '../models/openai-compatible.service';
import type { ResolvedModel } from '../models/model-registry';

@Injectable()
export class AiService {
  constructor(
    private azureAI: AzureOpenAIService,
    private anthropicAI: AnthropicService,
    private openAICompatible: OpenAICompatibleService,
  ) {}

  async chat(model: ResolvedModel, prompt: string): Promise<string> {
    if (model.source === 'custom') {
      return this.openAICompatible.chat(model, prompt, model.reasoningEffort);
    }
    return model.provider === 'claude'
      ? this.anthropicAI.chat(model.modelName, prompt, model.reasoningEffort)
      : this.azureAI.chat(model.modelName, prompt, model.reasoningEffort);
  }
}
