import client from './client';
import type { Model } from '../types';
export const getModels = () => client.get<Model[]>('/models');

export type ModelCatalogUpdate = Partial<
  Pick<Model, 'label' | 'enabled' | 'defaultReasoningEffort' | 'sortOrder' | 'isDefault'>
>;

export const getAdminModels = () => client.get<Model[]>('/admin/models');

export const updateAdminModel = (modelName: string, data: ModelCatalogUpdate) =>
  client.patch<Model>(`/admin/models/${encodeURIComponent(modelName)}`, data);

export const reorderAdminModels = (models: Array<{ modelName: string; sortOrder: number }>) =>
  client.patch<Model[]>('/admin/models/order', { models });
