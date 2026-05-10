import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ModelsService {
  constructor(private config: ConfigService) {}

  getModels() {
    const parseList = (raw: string) =>
      raw.split(',').map((m) => m.trim()).filter(Boolean);

    const azureModels = parseList(
      this.config.get<string>('AZURE_OPENAI_MODELS', 'gpt-5.4,gpt-5.4-mini'),
    ).map((name) => ({ name, label: name }));

    const anthropicRaw = this.config.get<string>('ANTHROPIC_MODELS', '');
    const anthropicModels = parseList(anthropicRaw).map((name) => ({ name, label: name }));

    return [...azureModels, ...anthropicModels];
  }
}
