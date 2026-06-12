import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildModelCatalogEntry,
  inferModelProvider,
  type ModelCatalogEntry,
  type ModelProvider,
  type ReasoningEffort,
} from './model-registry';
import { ReorderModelCatalogDto, UpdateModelCatalogDto } from './dto/model-catalog.dto';

@Injectable()
export class ModelsService {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

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

  private async modelSettings() {
    return this.prisma.modelCatalogSetting.findMany();
  }

  private mergeSettings(
    models: ModelCatalogEntry[],
    settings: Awaited<ReturnType<ModelsService['modelSettings']>>,
  ): ModelCatalogEntry[] {
    const settingsByName = new Map(settings.map((setting) => [setting.modelName, setting]));
    const explicitDefault = settings.find(
      (setting) =>
        setting.isDefault && setting.enabled && models.some((m) => m.name === setting.modelName),
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
      .sort((a, b) => {
        return a.sortOrder - b.sortOrder || a.label.localeCompare(b.label);
      });
  }

  async getModels(): Promise<ModelCatalogEntry[]> {
    const models = this.mergeSettings(this.configuredModels(), await this.modelSettings());
    return models.filter((model) => model.enabled);
  }

  async getAdminModels(): Promise<ModelCatalogEntry[]> {
    return this.mergeSettings(this.configuredModels(), await this.modelSettings());
  }

  async getModel(name: string): Promise<ModelCatalogEntry | undefined> {
    return (await this.getAdminModels()).find((model) => model.name === name);
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

  async updateAdminModel(modelName: string, input: UpdateModelCatalogDto) {
    const model = (await this.getAdminModels()).find((item) => item.name === modelName);
    if (!model) {
      throw new BadRequestException('Model is not configured');
    }

    if (input.isDefault) {
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
            defaultReasoningEffort: input.defaultReasoningEffort,
            sortOrder: input.sortOrder,
            isDefault: true,
          },
          update: {
            label: input.label,
            enabled: input.enabled,
            defaultReasoningEffort: input.defaultReasoningEffort,
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
          defaultReasoningEffort: input.defaultReasoningEffort,
          sortOrder: input.sortOrder,
          isDefault: false,
        },
        update: {
          label: input.label,
          enabled: input.enabled,
          defaultReasoningEffort: input.defaultReasoningEffort,
          sortOrder: input.sortOrder,
          isDefault: input.isDefault,
        },
      });
    }

    return (await this.getAdminModels()).find((item) => item.name === modelName);
  }

  async reorderAdminModels(input: ReorderModelCatalogDto) {
    const configuredModelNames = new Set(this.configuredModels().map((model) => model.name));
    const orderItems = input.models.map((item) => {
      if (!configuredModelNames.has(item.modelName)) {
        throw new BadRequestException(`Model is not configured: ${item.modelName}`);
      }
      return {
        modelName: item.modelName,
        sortOrder: item.sortOrder,
      };
    });

    await this.prisma.$transaction(
      orderItems.map((item) =>
        this.prisma.modelCatalogSetting.upsert({
          where: { modelName: item.modelName },
          create: {
            modelName: item.modelName,
            enabled: true,
            sortOrder: item.sortOrder,
          },
          update: { sortOrder: item.sortOrder },
        }),
      ),
    );

    return this.getAdminModels();
  }
}
