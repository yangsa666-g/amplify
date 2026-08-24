export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high' | 'xhigh';
export type ModelProvider = 'openai' | 'claude';
export type ModelIcon = 'openai' | 'claude';
export type ModelSource = 'environment' | 'custom';
export type OpenAICompatibleProtocol = 'chat_completions' | 'responses';
export type CredentialStatus = 'ready' | 'master_key_missing' | 'decrypt_failed';

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

export interface AdminModelCatalogEntry extends ModelCatalogEntry {
  source: ModelSource;
  endpoint?: string;
  upstreamModelName?: string;
  apiProtocol?: OpenAICompatibleProtocol;
  hasApiKey?: boolean;
  credentialStatus?: CredentialStatus;
}

export interface OpenAICompatibleConnection {
  endpoint: string;
  apiKey: string;
  upstreamModelName: string;
  apiProtocol: OpenAICompatibleProtocol;
  supportsReasoning: boolean;
}

export type ResolvedModel =
  | {
      source: 'environment';
      provider: ModelProvider;
      modelName: string;
      supportsReasoning: boolean;
      reasoningEffort: ReasoningEffort;
    }
  | ({
      source: 'custom';
      provider: 'openai';
      modelName: string;
      reasoningEffort: ReasoningEffort;
    } & OpenAICompatibleConnection);

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
