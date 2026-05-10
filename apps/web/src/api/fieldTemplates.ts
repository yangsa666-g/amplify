import client from './client';
import { FieldTemplate, FieldTemplateItem } from '../types';

// ─── User API ────────────────────────────────────────────────────────────────

export const listFieldTemplates = () =>
  client.get<FieldTemplate[]>('/field-templates');

export const getFieldTemplateById = (id: string) =>
  client.get<FieldTemplate>(`/field-templates/${id}`);

export const createFieldTemplate = (name: string, items: FieldTemplateItem[]) =>
  client.post<FieldTemplate>('/field-templates', { name, items });

export const updateFieldTemplate = (id: string, name: string, items: FieldTemplateItem[]) =>
  client.put<FieldTemplate>(`/field-templates/${id}`, { name, items });

export const deleteFieldTemplate = (id: string) =>
  client.delete<{ deleted: boolean }>(`/field-templates/${id}`);

export const duplicateFieldTemplate = (systemId: string) =>
  client.post<FieldTemplate>(`/field-templates/${systemId}/duplicate`);

// ─── Admin API ────────────────────────────────────────────────────────────────

export const adminListFieldTemplates = () =>
  client.get<FieldTemplate[]>('/admin/field-templates');

export const adminCreateFieldTemplate = (name: string, items: FieldTemplateItem[]) =>
  client.post<FieldTemplate>('/admin/field-templates', { name, items });

export const adminUpdateFieldTemplate = (id: string, name: string, items: FieldTemplateItem[]) =>
  client.put<FieldTemplate>(`/admin/field-templates/${id}`, { name, items });

export const adminDeleteFieldTemplate = (id: string) =>
  client.delete<{ deleted: boolean }>(`/admin/field-templates/${id}`);

export const adminSetDefaultFieldTemplate = (id: string) =>
  client.post<FieldTemplate>(`/admin/field-templates/${id}/set-default`);
