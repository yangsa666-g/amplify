import client from './client';
import type { CompareJob, CompareJobFeedback, CompareResult, ReasoningEffort } from '../types';

export const runCompare = (
  documentIds: string[],
  model: string,
  promptTemplateId?: string,
  reasoningEffort?: ReasoningEffort,
) =>
  client.post<CompareResult>('/compare/run', {
    documentIds,
    model,
    promptTemplateId,
    reasoningEffort,
  });

export const getCompareJob = (id: string) => client.get<CompareJob>(`/compare/${id}`);

export const getRecentCompare = () => client.get<CompareJob[]>('/compare/recent');

export const submitCompareFeedback = (jobId: string, rating: number, comment?: string) =>
  client.post<CompareJobFeedback>(`/compare/${jobId}/feedback`, { rating, comment });

export const getCompareFeedback = (jobId: string) =>
  client.get<CompareJobFeedback[]>(`/compare/${jobId}/feedback`);
