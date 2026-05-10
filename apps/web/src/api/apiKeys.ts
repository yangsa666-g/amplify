import client from './client';

export type ExpiryOption = '1m' | '3m' | '6m' | '1y' | 'never';

export interface ApiKeyInfo {
  id: string;
  keyPrefix: string;
  expiresAt: string | null;
  createdAt: string;
  createdBy: string;
}

export interface ApiKeyCreated extends ApiKeyInfo {
  rawKey: string;
}

export const getApiKey = () => client.get<ApiKeyInfo | null>('/admin/api-keys');

export const createApiKey = (expiry: ExpiryOption) =>
  client.post<ApiKeyCreated>('/admin/api-keys', { expiry });

export const deleteApiKey = (id: string) => client.delete(`/admin/api-keys/${id}`);
