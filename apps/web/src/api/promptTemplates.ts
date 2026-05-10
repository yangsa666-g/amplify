import client from './client';
import { PromptTemplate } from '../types';

// ─── User API ────────────────────────────────────────────────────────────────

export const listPromptTemplates = (type = 'risk_analysis') =>
  client.get<PromptTemplate[]>(`/prompt-templates?type=${type}`);

export const getPromptTemplateById = (id: string) =>
  client.get<PromptTemplate>(`/prompt-templates/${id}`);

export const createPromptTemplate = (name: string, content: string, type = 'risk_analysis') =>
  client.post<PromptTemplate>(`/prompt-templates?type=${type}`, { name, content });

export const updatePromptTemplate = (id: string, name: string, content: string) =>
  client.put<PromptTemplate>(`/prompt-templates/${id}`, { name, content });

export const deletePromptTemplate = (id: string) =>
  client.delete<{ deleted: boolean }>(`/prompt-templates/${id}`);

export const duplicatePromptTemplate = (systemId: string) =>
  client.post<PromptTemplate>(`/prompt-templates/${systemId}/duplicate`);

// ─── Admin API ────────────────────────────────────────────────────────────────

export const adminListPromptTemplates = (type = 'risk_analysis') =>
  client.get<PromptTemplate[]>(`/admin/prompt-templates?type=${type}`);

export const adminCreatePromptTemplate = (name: string, content: string, type = 'risk_analysis') =>
  client.post<PromptTemplate>(`/admin/prompt-templates?type=${type}`, { name, content });

export const adminUpdatePromptTemplate = (id: string, name: string, content: string) =>
  client.put<PromptTemplate>(`/admin/prompt-templates/${id}`, { name, content });

export const adminDeletePromptTemplate = (id: string) =>
  client.delete<{ deleted: boolean }>(`/admin/prompt-templates/${id}`);

export const adminSetDefaultPromptTemplate = (id: string, type = 'risk_analysis') =>
  client.post<PromptTemplate>(`/admin/prompt-templates/${id}/set-default?type=${type}`);
