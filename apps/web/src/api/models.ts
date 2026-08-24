import client from './client';
import type { Model } from '../types';
export const getModels = () => client.get<Model[]>('/models');

export type ModelCatalogUpdate = Partial<
  Pick<
    Model,
    | 'label'
    | 'enabled'
    | 'defaultReasoningEffort'
    | 'sortOrder'
    | 'isDefault'
    | 'endpoint'
    | 'upstreamModelName'
    | 'apiProtocol'
    | 'supportsReasoning'
  >
> & { apiKey?: string };

export interface CustomModelInput {
  name: string;
  label: string;
  endpoint: string;
  upstreamModelName: string;
  apiProtocol: 'chat_completions' | 'responses';
  apiKey: string;
  supportsReasoning: boolean;
  enabled: boolean;
}

export type TestModelConnectionInput = Partial<CustomModelInput> & { name?: string };

export const getAdminModels = () => client.get<Model[]>('/admin/models');

export const getModelConfigurationStatus = () =>
  client.get<{ customModelsEnabled: boolean }>('/admin/models/configuration-status');

export const createAdminModel = (data: CustomModelInput) =>
  client.post<Model>('/admin/models', data);

export const updateAdminModel = (modelName: string, data: ModelCatalogUpdate) =>
  client.patch<Model>(`/admin/models/${encodeURIComponent(modelName)}`, data);

export const reorderAdminModels = (models: Array<{ modelName: string; sortOrder: number }>) =>
  client.patch<Model[]>('/admin/models/order', { models });

export const deleteAdminModel = (modelName: string) =>
  client.delete<{ deleted: boolean }>(`/admin/models/${encodeURIComponent(modelName)}`);

export const testModelConnection = (data: TestModelConnectionInput) =>
  client.post<{ ok: true; latencyMs: number }>('/admin/models/test-connection', data);
