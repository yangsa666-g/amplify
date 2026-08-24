import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildModelCatalogEntry,
  type AdminModelCatalogEntry,
  type CredentialStatus,
  type ModelCatalogEntry,
  type ModelProvider,
  type OpenAICompatibleConnection,
  type OpenAICompatibleProtocol,
  type ReasoningEffort,
  type ResolvedModel,
} from './model-registry';
import {
  CreateOpenAICompatibleModelDto,
  ReorderModelCatalogDto,
  TestOpenAICompatibleModelDto,
  UpdateModelCatalogDto,
} from './dto/model-catalog.dto';
import { ModelCredentialsService } from './model-credentials.service';
import { OpenAICompatibleService } from './openai-compatible.service';

@Injectable()
export class ModelsService {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private credentials: ModelCredentialsService,
    private openAICompatible: OpenAICompatibleService,
  ) {}

  private parseModelList(raw: string) {
    return raw
      .split(',')
      .map((model) => model.trim())
      .filter(Boolean);
  }

  private environmentModels(): AdminModelCatalogEntry[] {
    const azureModels = this.parseModelList(
      this.config.get<string>('AZURE_OPENAI_MODELS', 'gpt-5.4,gpt-5.4-mini'),
    ).map((name) => ({
      ...buildModelCatalogEntry(name, 'openai'),
      source: 'environment' as const,
    }));
    const anthropicModels = this.parseModelList(
      this.config.get<string>('ANTHROPIC_MODELS', ''),
    ).map((name) => ({
      ...buildModelCatalogEntry(name, 'claude'),
      source: 'environment' as const,
    }));
    return [...azureModels, ...anthropicModels].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
    );
  }

  private async modelSettings() {
    return this.prisma.modelCatalogSetting.findMany();
  }

  private credentialStatus(encryptedApiKey: string): CredentialStatus {
    if (!this.credentials.isConfigured()) return 'master_key_missing';
    try {
      this.credentials.decrypt(encryptedApiKey);
      return 'ready';
    } catch {
      return 'decrypt_failed';
    }
  }

  private customCatalogEntry(model: {
    name: string;
    endpoint: string;
    upstreamModelName: string;
    apiProtocol: string;
    encryptedApiKey: string;
    supportsReasoning: boolean;
  }): AdminModelCatalogEntry {
    return {
      ...buildModelCatalogEntry(model.name, 'openai'),
      source: 'custom',
      endpoint: model.endpoint,
      upstreamModelName: model.upstreamModelName,
      apiProtocol: model.apiProtocol as OpenAICompatibleProtocol,
      hasApiKey: Boolean(model.encryptedApiKey),
      credentialStatus: this.credentialStatus(model.encryptedApiKey),
      supportsReasoning: model.supportsReasoning,
      reasoningEfforts: model.supportsReasoning
        ? ['none', 'low', 'medium', 'high', 'xhigh']
        : ['none'],
      defaultReasoningEffort: model.supportsReasoning ? 'medium' : 'none',
    };
  }

  private mergeSettings<T extends ModelCatalogEntry>(
    models: T[],
    settings: Awaited<ReturnType<ModelsService['modelSettings']>>,
  ): T[] {
    const settingsByName = new Map(settings.map((setting) => [setting.modelName, setting]));
    const explicitDefault = settings.find(
      (setting) =>
        setting.isDefault &&
        setting.enabled &&
        models.some((model) => model.name === setting.modelName),
    )?.modelName;
    const fallbackDefault =
      explicitDefault ??
      models.find((model) => {
        const setting = settingsByName.get(model.name);
        return setting?.enabled ?? model.enabled;
      })?.name;

    return models
      .map((model) => {
        const setting = settingsByName.get(model.name);
        return {
          ...model,
          label: setting?.label?.trim() || model.label,
          enabled: setting?.enabled ?? model.enabled,
          defaultReasoningEffort:
            setting?.defaultReasoningEffort &&
            model.reasoningEfforts.includes(setting.defaultReasoningEffort as ReasoningEffort)
              ? (setting.defaultReasoningEffort as ReasoningEffort)
              : model.defaultReasoningEffort,
          sortOrder: setting?.sortOrder ?? model.sortOrder,
          isDefault: model.name === fallbackDefault,
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  }

  private async rawAdminModels(): Promise<AdminModelCatalogEntry[]> {
    const customModels = await this.prisma.openAICompatibleModel.findMany();
    return [
      ...this.environmentModels(),
      ...customModels.map((model) => this.customCatalogEntry(model)),
    ];
  }

  async getModels(): Promise<ModelCatalogEntry[]> {
    const [rawModels, settings] = await Promise.all([this.rawAdminModels(), this.modelSettings()]);
    const usableModels = rawModels.filter(
      (model) => model.source === 'environment' || model.credentialStatus === 'ready',
    );
    return this.mergeSettings(usableModels, settings)
      .filter((model) => model.enabled)
      .map((model) => ({
        name: model.name,
        label: model.label,
        provider: model.provider,
        icon: model.icon,
        enabled: model.enabled,
        isDefault: model.isDefault,
        supportsReasoning: model.supportsReasoning,
        reasoningEfforts: model.reasoningEfforts,
        defaultReasoningEffort: model.defaultReasoningEffort,
        sortOrder: model.sortOrder,
      }));
  }

  async getAdminModels(): Promise<AdminModelCatalogEntry[]> {
    const [models, settings] = await Promise.all([this.rawAdminModels(), this.modelSettings()]);
    return this.mergeSettings(models, settings);
  }

  getConfigurationStatus() {
    return { customModelsEnabled: this.credentials.isConfigured() };
  }

  async getProvider(name: string): Promise<ModelProvider> {
    const model = (await this.getModels()).find((item) => item.name === name);
    if (!model) throw new BadRequestException('Model is not available');
    return model.provider;
  }

  async normalizeReasoningEffort(name: string, effort?: ReasoningEffort): Promise<ReasoningEffort> {
    const model = (await this.getModels()).find((item) => item.name === name);
    if (!model) throw new BadRequestException('Model is not available');
    const requestedEffort = effort ?? model.defaultReasoningEffort;
    return model.reasoningEfforts.includes(requestedEffort)
      ? requestedEffort
      : model.defaultReasoningEffort;
  }

  async resolveForExecution(name: string, effort?: ReasoningEffort): Promise<ResolvedModel> {
    const model = (await this.getModels()).find((item) => item.name === name);
    if (!model) throw new BadRequestException('Model is not available');
    const requestedEffort = effort ?? model.defaultReasoningEffort;
    const reasoningEffort = model.reasoningEfforts.includes(requestedEffort)
      ? requestedEffort
      : model.defaultReasoningEffort;
    const custom = await this.prisma.openAICompatibleModel.findUnique({ where: { name } });
    if (!custom) {
      return {
        source: 'environment',
        provider: model.provider,
        modelName: name,
        supportsReasoning: model.supportsReasoning,
        reasoningEffort,
      };
    }
    return {
      source: 'custom',
      provider: 'openai',
      modelName: name,
      endpoint: custom.endpoint,
      apiKey: this.credentials.decrypt(custom.encryptedApiKey),
      upstreamModelName: custom.upstreamModelName,
      apiProtocol: custom.apiProtocol as OpenAICompatibleProtocol,
      supportsReasoning: custom.supportsReasoning,
      reasoningEffort,
    };
  }

  async createAdminModel(input: CreateOpenAICompatibleModelDto) {
    const apiKey = input.apiKey.trim();
    const label = input.label.trim();
    const upstreamModelName = input.upstreamModelName.trim();
    if (!apiKey) throw new BadRequestException('API key is required');
    if (!label || !upstreamModelName) {
      throw new BadRequestException('Display name and upstream model name are required');
    }
    if (!this.credentials.isConfigured()) this.credentials.encrypt(apiKey);
    if (this.environmentModels().some((model) => model.name === input.name)) {
      throw new ConflictException('Model name conflicts with an environment model');
    }
    if (await this.prisma.openAICompatibleModel.findUnique({ where: { name: input.name } })) {
      throw new ConflictException('Model name is already configured');
    }

    const currentModels = await this.getAdminModels();
    const nextSortOrder = Math.max(0, ...currentModels.map((model) => model.sortOrder)) + 10;
    try {
      await this.prisma.$transaction([
        this.prisma.openAICompatibleModel.create({
          data: {
            name: input.name,
            endpoint: this.normalizeEndpoint(input.endpoint),
            upstreamModelName,
            apiProtocol: input.apiProtocol,
            encryptedApiKey: this.credentials.encrypt(apiKey),
            supportsReasoning: input.supportsReasoning,
          },
        }),
        this.prisma.modelCatalogSetting.upsert({
          where: { modelName: input.name },
          create: {
            modelName: input.name,
            label,
            enabled: input.enabled,
            defaultReasoningEffort: input.supportsReasoning ? 'medium' : 'none',
            sortOrder: nextSortOrder,
          },
          update: {
            label,
            enabled: input.enabled,
            defaultReasoningEffort: input.supportsReasoning ? 'medium' : 'none',
            sortOrder: nextSortOrder,
            isDefault: false,
          },
        }),
      ]);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Model name is already configured');
      }
      throw error;
    }
    return (await this.getAdminModels()).find((model) => model.name === input.name);
  }

  async updateAdminModel(modelName: string, input: UpdateModelCatalogDto) {
    const model = (await this.getAdminModels()).find((item) => item.name === modelName);
    if (!model) throw new NotFoundException('Model is not configured');

    const hasConnectionUpdate =
      input.endpoint !== undefined ||
      input.upstreamModelName !== undefined ||
      input.apiProtocol !== undefined ||
      input.apiKey !== undefined ||
      input.supportsReasoning !== undefined;
    const custom = await this.prisma.openAICompatibleModel.findUnique({
      where: { name: modelName },
    });
    if (hasConnectionUpdate && !custom) {
      throw new BadRequestException('Environment model connection settings are read-only');
    }
    if (hasConnectionUpdate && !this.credentials.isConfigured()) {
      throw new BadRequestException('Custom model credential encryption is not configured');
    }
    if (custom && hasConnectionUpdate) {
      const apiKey = input.apiKey?.trim();
      const upstreamModelName = input.upstreamModelName?.trim();
      if (input.apiKey !== undefined && !apiKey) {
        throw new BadRequestException('API key cannot be empty');
      }
      if (input.upstreamModelName !== undefined && !upstreamModelName) {
        throw new BadRequestException('Upstream model name cannot be empty');
      }
      await this.prisma.openAICompatibleModel.update({
        where: { name: modelName },
        data: {
          endpoint: input.endpoint ? this.normalizeEndpoint(input.endpoint) : undefined,
          upstreamModelName,
          apiProtocol: input.apiProtocol,
          encryptedApiKey: apiKey ? this.credentials.encrypt(apiKey) : undefined,
          supportsReasoning: input.supportsReasoning,
        },
      });
    }

    const defaultReasoningEffort =
      input.supportsReasoning === false ? 'none' : input.defaultReasoningEffort;
    if (input.isDefault) {
      if (model.source === 'custom' && model.credentialStatus !== 'ready') {
        throw new BadRequestException('A model with unavailable credentials cannot be the default');
      }
      if (!model.enabled && input.enabled !== true) {
        throw new BadRequestException('A disabled model cannot be the default');
      }
      await this.prisma.$transaction([
        this.prisma.modelCatalogSetting.updateMany({
          where: { isDefault: true, modelName: { not: modelName } },
          data: { isDefault: false },
        }),
        this.prisma.modelCatalogSetting.upsert({
          where: { modelName },
          create: {
            modelName,
            label: input.label,
            enabled: input.enabled ?? true,
            defaultReasoningEffort,
            sortOrder: input.sortOrder,
            isDefault: true,
          },
          update: {
            label: input.label,
            enabled: input.enabled,
            defaultReasoningEffort,
            sortOrder: input.sortOrder,
            isDefault: true,
          },
        }),
      ]);
    } else {
      await this.prisma.modelCatalogSetting.upsert({
        where: { modelName },
        create: {
          modelName,
          label: input.label,
          enabled: input.enabled ?? true,
          defaultReasoningEffort,
          sortOrder: input.sortOrder,
          isDefault: false,
        },
        update: {
          label: input.label,
          enabled: input.enabled,
          defaultReasoningEffort,
          sortOrder: input.sortOrder,
          isDefault: input.isDefault,
        },
      });
    }
    return (await this.getAdminModels()).find((item) => item.name === modelName);
  }

  async deleteAdminModel(modelName: string) {
    const custom = await this.prisma.openAICompatibleModel.findUnique({
      where: { name: modelName },
    });
    if (!custom) {
      if (this.environmentModels().some((model) => model.name === modelName)) {
        throw new BadRequestException('Environment models cannot be deleted');
      }
      throw new NotFoundException('Custom model is not configured');
    }
    await this.prisma.$transaction([
      this.prisma.openAICompatibleModel.delete({ where: { name: modelName } }),
      this.prisma.modelCatalogSetting.deleteMany({ where: { modelName } }),
    ]);
    return { deleted: true };
  }

  async reorderAdminModels(input: ReorderModelCatalogDto) {
    const configuredNames = new Set((await this.getAdminModels()).map((model) => model.name));
    const items = input.models.map((item) => {
      if (!configuredNames.has(item.modelName)) {
        throw new BadRequestException(`Model is not configured: ${item.modelName}`);
      }
      return item;
    });
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.modelCatalogSetting.upsert({
          where: { modelName: item.modelName },
          create: { modelName: item.modelName, enabled: true, sortOrder: item.sortOrder },
          update: { sortOrder: item.sortOrder },
        }),
      ),
    );
    return this.getAdminModels();
  }

  async testConnection(input: TestOpenAICompatibleModelDto) {
    if (!this.credentials.isConfigured()) {
      throw new BadRequestException('Custom model credential encryption is not configured');
    }
    const stored = input.name
      ? await this.prisma.openAICompatibleModel.findUnique({ where: { name: input.name } })
      : null;
    const endpoint = input.endpoint ?? stored?.endpoint;
    const upstreamModelName = (input.upstreamModelName ?? stored?.upstreamModelName)?.trim();
    const apiProtocol = input.apiProtocol ?? stored?.apiProtocol;
    const providedApiKey = input.apiKey?.trim();
    if (input.apiKey !== undefined && !providedApiKey) {
      throw new BadRequestException('API key cannot be empty');
    }
    const apiKey =
      providedApiKey ?? (stored ? this.credentials.decrypt(stored.encryptedApiKey) : undefined);
    if (!endpoint || !upstreamModelName || !apiProtocol || !apiKey) {
      throw new BadRequestException('Endpoint, API key, model name, and protocol are required');
    }
    const connection: OpenAICompatibleConnection = {
      endpoint: this.normalizeEndpoint(endpoint),
      upstreamModelName: upstreamModelName.trim(),
      apiProtocol: apiProtocol as OpenAICompatibleProtocol,
      apiKey,
      supportsReasoning: input.supportsReasoning ?? stored?.supportsReasoning ?? false,
    };
    const startedAt = Date.now();
    const result = await this.openAICompatible.chat(connection, 'Reply with exactly OK.', 'none');
    if (!result.trim()) throw new BadGatewayException('The model returned an empty response');
    return { ok: true, latencyMs: Date.now() - startedAt };
  }

  private normalizeEndpoint(endpoint: string): string {
    const trimmed = endpoint.trim();
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new BadRequestException('Endpoint must use HTTP or HTTPS');
    }
    return trimmed.replace(/\/+$/, '');
  }
}
