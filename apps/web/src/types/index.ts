export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  authProvider: 'local' | 'entra';
}

export interface Model {
  name: string;
  label: string;
}

export interface FieldTemplateItem {
  id?: string;
  fieldName: string;
  fieldDescription: string;
  sortOrder: number;
}

export interface FieldTemplate {
  id: string;
  name: string;
  items: FieldTemplateItem[];
  source?: 'personal' | 'system';
}

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  source?: 'personal' | 'system';
}

export interface Document {
  id: string;
  fileName: string;
  fileSize: number;
  textExtractionStatus: 'pending' | 'success' | 'failed';
  extractionError?: string | null;
}

export interface AnalysisJob {
  id: string;
  documentId: string;
  userId?: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  modelName: string;
  createdAt: string;
  document: { fileName: string };
  user?: { id: string; name: string; email: string };
  feedbacks?: Array<{ userId: string; rating: number; comment?: string | null }>;
  fieldExtractionResult?: { id: string; resultJson?: any[] } | null;
  riskAnalysisResult?: {
    id: string;
    resultText?: string;
    resultJson?: { originalContractDescription: string; riskAnalysis: string };
  } | null;
  errorMessage?: string | null;
}

export interface AnalysisJobFeedback {
  id: string;
  analysisJobId: string;
  userId: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  user: { id: string; name: string };
}

export interface AnalysisResult {
  analysisJobId: string;
  status: string;
  fieldExtractionResult: any[];
  riskAnalysisResult: { originalContractDescription: string; riskAnalysis: string };
}

export interface CompareJob {
  id: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  diffMode: 'unified' | 'side_by_side';
  createdAt: string;
  oldDocument: { fileName: string };
  newDocument: { fileName: string };
  diffResultJson?: { chunks: DiffChunk[]; stats: DiffStats } | null;
  errorMessage?: string | null;
}

export interface CompareResult {
  compareJobId: string;
  status: string;
  diffMode: string;
  diffResult: { chunks: DiffChunk[]; stats: DiffStats };
}

export interface DiffChunk {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
  lines: string[];
}

export interface DiffStats {
  added: number;
  removed: number;
  unchanged: number;
}
