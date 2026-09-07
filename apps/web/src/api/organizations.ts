import client from './client';
import type { Organization } from '../types';

export const getOrganizations = () => client.get<Organization[]>('/admin/organizations');

export const createOrganization = (data: {
  name: string;
  firstAdmin: {
    name: string;
    email: string;
    password?: string;
    authProvider: 'local' | 'entra';
  };
}) => client.post<Organization>('/admin/organizations', data);

export const updateOrganization = (id: string, data: { name?: string }) =>
  client.patch<Organization>(`/admin/organizations/${id}`, data);

export const updateOrganizationStatus = (id: string, status: 'active' | 'disabled') =>
  client.patch<Organization>(`/admin/organizations/${id}/status`, { status });
