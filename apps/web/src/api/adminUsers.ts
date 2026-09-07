import client from './client';
import type { User } from '../types';

export const getAdminUsers = (params?: {
  organizationId?: string | null;
  role?: User['role'];
  status?: string;
  q?: string;
}) => client.get<User[]>('/admin/users', { params });

export const createAdminUser = (data: {
  name: string;
  email: string;
  password?: string;
  role: User['role'];
  organizationId?: string | null;
  authProvider?: 'local' | 'entra';
}) => client.post<User>('/admin/users', data);

export const updateAdminUser = (
  id: string,
  data: {
    name?: string;
    email?: string;
    role?: User['role'];
    organizationId?: string | null;
  },
) => client.patch<User>(`/admin/users/${id}`, data);

export const updateAdminUserRole = (
  id: string,
  role: User['role'],
  organizationId?: string | null,
) => client.patch<User>(`/admin/users/${id}/role`, { role, organizationId });

export const updateAdminUserStatus = (id: string, status: 'active' | 'disabled') =>
  client.patch<User>(`/admin/users/${id}/status`, { status });

export const deleteAdminUser = (id: string) => client.delete(`/admin/users/${id}`);
