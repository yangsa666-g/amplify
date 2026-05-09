import client from './client';
import { AnalysisResult, AnalysisJob } from '../types';

export const runAnalysis = (documentId: string, model: string) =>
  client.post<AnalysisResult>('/analysis/run', { documentId, model });

export const getAnalysisJob = (id: string) => client.get<AnalysisJob>(`/analysis/${id}`);

export const getRecentAnalysis = () => client.get<AnalysisJob[]>('/analysis/recent');
