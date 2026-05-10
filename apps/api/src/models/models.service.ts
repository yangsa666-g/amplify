import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ModelsService {
  constructor(private config: ConfigService) {}

  getModels() {
    const raw = this.config.get<string>('AZURE_OPENAI_MODELS', 'gpt-5.4,gpt-5.4-mini');
    return raw.split(',').map((m) => ({ name: m.trim(), label: m.trim() }));
  }
}
