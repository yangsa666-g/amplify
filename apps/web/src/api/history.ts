import client from './client';
import { AnalysisJob, CompareJob } from '../types';

export const getHistory = () =>
  client.get<{ analysisJobs: AnalysisJob[]; compareJobs: CompareJob[] }>('/history');
