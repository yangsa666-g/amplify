import client from './client';
import type { AnalysisJob, CompareJob } from '../types';

export const getHistory = () =>
  client.get<{ analysisJobs: AnalysisJob[]; compareJobs: CompareJob[] }>('/history');

// Admin-only: every user's history, for the "All History" page.
export const getAllHistory = () =>
  client.get<{ analysisJobs: AnalysisJob[]; compareJobs: CompareJob[] }>('/history/all');
