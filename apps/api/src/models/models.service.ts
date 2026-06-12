import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  buildModelCatalogEntry,
  inferModelProvider,
  type ModelCatalogEntry,
  type ModelProvider,
  type ReasoningEffort,
} from './model-registry';

@Injectable()
export class ModelsService {
  constructor(private config: ConfigService) {}

  private parseModelList(raw: string) {
    return raw
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
  }

  private configuredModels(): ModelCatalogEntry[] {
    const azureModels = this.parseModelList(
      this.config.get<string>('AZURE_OPENAI_MODELS', 'gpt-5.4,gpt-5.4-mini'),
    ).map((name) => buildModelCatalogEntry(name, 'openai'));

    const anthropicRaw = this.config.get<string>('ANTHROPIC_MODELS', '');
    const anthropicModels = this.parseModelList(anthropicRaw).map((name) =>
      buildModelCatalogEntry(name, 'claude'),
    );

    return [...azureModels, ...anthropicModels].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
    );
  }

  async getModels(): Promise<ModelCatalogEntry[]> {
    return this.configuredModels();
  }

  async getModel(name: string): Promise<ModelCatalogEntry | undefined> {
    return this.configuredModels().find((model) => model.name === name);
  }

  async getProvider(name: string): Promise<ModelProvider> {
    return (await this.getModel(name))?.provider ?? inferModelProvider(name) ?? 'openai';
  }

  async normalizeReasoningEffort(name: string, effort?: ReasoningEffort): Promise<ReasoningEffort> {
    const model =
      (await this.getModel(name)) ?? buildModelCatalogEntry(name, await this.getProvider(name));
    const requestedEffort = effort ?? model.defaultReasoningEffort;
    return model.reasoningEfforts.includes(requestedEffort)
      ? requestedEffort
      : model.defaultReasoningEffort;
  }
}
