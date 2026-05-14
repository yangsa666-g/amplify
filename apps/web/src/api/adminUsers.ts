import client from './client';
import type { User } from '../types';

export const getAdminUsers = () =>
  client.get<User[]>('/admin/users');

export const createAdminUser = (data: { name: string; email: string; password: string; role: 'admin' | 'user' }) =>
  client.post<User>('/admin/users', data);

export const updateAdminUser = (id: string, data: { name?: string; email?: string }) =>
  client.patch<User>(`/admin/users/${id}`, data);

export const updateAdminUserRole = (id: string, role: 'admin' | 'user') =>
  client.patch<User>(`/admin/users/${id}/role`, { role });

export const updateAdminUserStatus = (id: string, status: 'active' | 'disabled') =>
  client.patch<User>(`/admin/users/${id}/status`, { status });

export const deleteAdminUser = (id: string) =>
  client.delete(`/admin/users/${id}`);
