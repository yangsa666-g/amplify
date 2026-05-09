import client from './client';
import { FieldTemplate, FieldTemplateItem } from '../types';

export const getCurrentFieldTemplate = () => client.get<FieldTemplate>('/field-templates/current');

export const saveFieldTemplate = (name: string, items: FieldTemplateItem[]) =>
  client.put<FieldTemplate>('/field-templates/current', { name, items });

export const resetFieldTemplate = () => client.post<FieldTemplate>('/field-templates/current/reset');

// Admin — system default
export const getAdminDefaultFieldTemplate = () =>
  client.get<FieldTemplate>('/admin/field-templates/default');

export const updateAdminDefaultFieldTemplate = (name: string, items: FieldTemplateItem[]) =>
  client.put<FieldTemplate>('/admin/field-templates/default', { name, items });
