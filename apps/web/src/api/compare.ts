import client from './client';
import type { CompareResult, CompareJob } from '../types';

export const runCompare = (oldDocumentId: string, newDocumentId: string, diffMode: 'unified' | 'side_by_side') =>
  client.post<CompareResult>('/compare/run', { oldDocumentId, newDocumentId, diffMode });

export const getCompareJob = (id: string) => client.get<CompareJob>(`/compare/${id}`);

export const getRecentCompare = () => client.get<CompareJob[]>('/compare/recent');
