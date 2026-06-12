export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high' | 'xhigh';
export type ModelProvider = 'openai' | 'claude';
export type ModelIcon = 'openai' | 'claude';

export interface ModelProviderDefinition {
  provider: ModelProvider;
  displayName: string;
  icon: ModelIcon;
  supportsReasoning: boolean;
  reasoningEfforts: ReasoningEffort[];
  defaultReasoningEffort: ReasoningEffort;
  sortOrder: number;
  modelNamePatterns: RegExp[];
}

export interface ModelCatalogEntry {
  name: string;
  label: string;
  provider: ModelProvider;
  icon: ModelIcon;
  enabled: boolean;
  isDefault: boolean;
  supportsReasoning: boolean;
  reasoningEfforts: ReasoningEffort[];
  defaultReasoningEffort: ReasoningEffort;
  sortOrder: number;
}

export const MODEL_PROVIDER_REGISTRY: Record<ModelProvider, ModelProviderDefinition> = {
  openai: {
    provider: 'openai',
    displayName: 'OpenAI',
    icon: 'openai',
    supportsReasoning: true,
    reasoningEfforts: ['none', 'low', 'medium', 'high', 'xhigh'],
    defaultReasoningEffort: 'medium',
    sortOrder: 10,
    modelNamePatterns: [/^gpt[-\w.]*/i, /^o\d[-\w.]*/i, /openai/i],
  },
  claude: {
    provider: 'claude',
    displayName: 'Claude',
    icon: 'claude',
    supportsReasoning: true,
    reasoningEfforts: ['none', 'low', 'medium', 'high', 'xhigh'],
    defaultReasoningEffort: 'medium',
    sortOrder: 20,
    modelNamePatterns: [/^claude[-\w.]*/i, /anthropic/i],
  },
};

export function inferModelProvider(modelName: string): ModelProvider | undefined {
  return Object.values(MODEL_PROVIDER_REGISTRY).find((definition) =>
    definition.modelNamePatterns.some((pattern) => pattern.test(modelName)),
  )?.provider;
}

export function buildModelCatalogEntry(
  name: string,
  provider: ModelProvider,
  label = name,
): ModelCatalogEntry {
  const definition = MODEL_PROVIDER_REGISTRY[provider];
  return {
    name,
    label,
    provider,
    icon: definition.icon,
    enabled: true,
    isDefault: false,
    supportsReasoning: definition.supportsReasoning,
    reasoningEfforts: [...definition.reasoningEfforts],
    defaultReasoningEffort: definition.defaultReasoningEffort,
    sortOrder: definition.sortOrder,
  };
}
