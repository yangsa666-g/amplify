import client from './client';
import type { AnalysisJob, CompareJob } from '../types';

export const getHistory = () =>
  client.get<{ analysisJobs: AnalysisJob[]; compareJobs: CompareJob[] }>('/history');
