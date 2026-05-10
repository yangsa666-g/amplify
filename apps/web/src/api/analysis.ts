import client from './client';
import { AnalysisResult, AnalysisJob, AnalysisJobFeedback } from '../types';

export const runAnalysis = (documentId: string, model: string, fieldTemplateId?: string, promptTemplateId?: string) =>
  client.post<AnalysisResult>('/analysis/run', { documentId, model, fieldTemplateId, promptTemplateId });

export const getAnalysisJob = (id: string) => client.get<AnalysisJob>(`/analysis/${id}`);

export const getRecentAnalysis = () => client.get<AnalysisJob[]>('/analysis/recent');

export const submitFeedback = (jobId: string, rating: number, comment?: string) =>
  client.post<AnalysisJobFeedback>(`/analysis/${jobId}/feedback`, { rating, comment });

export const getFeedback = (jobId: string) =>
  client.get<AnalysisJobFeedback[]>(`/analysis/${jobId}/feedback`);
