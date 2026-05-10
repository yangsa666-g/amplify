export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  authProvider: 'local' | 'entra';
  status?: 'active' | 'disabled';
  createdAt?: string;
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
  isSystem: boolean;
  isDefault: boolean;
  userId?: string | null;
  items: FieldTemplateItem[];
  scope?: 'system' | 'personal';
  createdAt?: string;
  updatedAt?: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  isSystem: boolean;
  isDefault: boolean;
  userId?: string | null;
  templateType?: string;
  scope?: 'system' | 'personal';
  createdAt?: string;
  updatedAt?: string;
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
  fieldTemplateId?: string | null;
  promptTemplateId?: string | null;
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
  user?: { id: string; name: string; email: string };
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

export interface AdminStats {
  period: '24h' | '7d' | '30d';
  analysis: {
    total: number;
    successRate: number;
    statusBreakdown: { pending: number; running: number; success: number; failed: number };
  };
  compare: {
    total: number;
    successRate: number;
    statusBreakdown: { pending: number; running: number; success: number; failed: number };
  };
  feedback: {
    total: number;
    thumbsUp: number;
    thumbsDown: number;
    positiveRate: number | null;
  };
  users: {
    activeCount: number;
    newCount: number;
    topUsers: Array<{
      userId: string;
      name: string;
      email: string;
      analysisCount: number;
      compareCount: number;
    }>;
  };
  modelUsage: Array<{ modelName: string; count: number }>;
  dailyVolume: Array<{ date: string; analyses: number; compares: number }>;
}

export interface TemplateRequest {
  id: string;
  userId: string;
  templateKind: 'field' | 'prompt';
  fieldTemplateId?: string | null;
  promptTemplateId?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string | null;
  reviewedById?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; email: string };
  fieldTemplate?: FieldTemplate | null;
  promptTemplate?: PromptTemplate | null;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'template_request_submitted' | 'template_request_approved' | 'template_request_rejected';
  title: string;
  body: string;
  isRead: boolean;
  requestId?: string | null;
  createdAt: string;
}
