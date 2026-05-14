import client from './client';
import type { AdminStats } from '../types';

export const getAdminStats = (period: '24h' | '7d' | '30d') =>
  client.get<AdminStats>(`/admin/dashboard/stats?period=${period}`);
