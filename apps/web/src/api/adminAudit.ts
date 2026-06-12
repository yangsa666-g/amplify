import client from './client';
import type { AuditLog, AuditLogResponse } from '../types';

export interface AdminAuditQuery {
  q?: string;
  userId?: string;
  action?: string;
  method?: string;
  statusCode?: number;
  from?: string;
  to?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface AuditRetention {
  retentionDays: number;
  cutoff: string;
}

export interface AuditCleanupResult extends AuditRetention {
  deletedCount: number;
}

export const getAdminAuditLogs = (params: AdminAuditQuery) =>
  client.get<AuditLogResponse>('/admin/audit', { params });

export const getAdminAuditActions = () =>
  client.get<Array<{ action: AuditLog['action']; count: number }>>('/admin/audit/actions');

export const getAdminAuditRetention = () => client.get<AuditRetention>('/admin/audit/retention');

export const cleanupAdminAuditLogs = () => client.post<AuditCleanupResult>('/admin/audit/cleanup');
