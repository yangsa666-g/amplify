import client from './client';
import type { TemplateRequest } from '../types';

export const getMyRequests = async (): Promise<TemplateRequest[]> => {
  const { data } = await client.get('/template-requests');
  return data;
};

export const submitRequest = async (body: {
  templateKind: 'field' | 'prompt';
  templateId: string;
}): Promise<TemplateRequest> => {
  const { data } = await client.post('/template-requests', body);
  return data;
};

export const getAdminRequests = async (): Promise<TemplateRequest[]> => {
  const { data } = await client.get('/admin/template-requests');
  return data;
};

export const approveRequest = async (id: string): Promise<TemplateRequest> => {
  const { data } = await client.put(`/admin/template-requests/${id}/approve`);
  return data;
};

export const rejectRequest = async (id: string, adminNote?: string): Promise<TemplateRequest> => {
  const { data } = await client.put(`/admin/template-requests/${id}/reject`, { adminNote });
  return data;
};
