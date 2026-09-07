import type { AxiosError } from 'axios';

export type ApiError = AxiosError<{ message?: string }>;

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'user';
  authProvider: 'local' | 'entra';
  status?: 'active' | 'disabled';
  organizationId?: string | null;
  organizationName?: string | null;
  organization?: Organization | null;
  createdAt?: string;
}

export interface AuthenticationConfiguration {
  localAuthEnabled: boolean;
  entraAuthEnabled: boolean;
}

export interface Organization {
  id: string;
  name: string;
  status: 'active' | 'disabled';
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    users?: number;
    documents?: number;
    analysisJobs?: number;
    compareJobs?: number;
  };
}

export interface Model {
  name: string;
  label: string;
  provider?: 'openai' | 'claude';
  icon?: 'openai' | 'claude';
  enabled?: boolean;
  isDefault?: boolean;
  supportsReasoning?: boolean;
  reasoningEfforts?: ReasoningEffort[];
  defaultReasoningEffort?: ReasoningEffort;
  sortOrder?: number;
  source?: 'environment' | 'custom';
  endpoint?: string;
  upstreamModelName?: string;
  apiProtocol?: 'chat_completions' | 'responses';
  hasApiKey?: boolean;
  credentialStatus?: 'ready' | 'master_key_missing' | 'decrypt_failed';
}

export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high' | 'xhigh';
export type PromptTemplateType = 'risk_analysis' | 'contract_comparison';

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
  templateScope?: 'platform' | 'organization' | 'personal';
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
  templateType?: PromptTemplateType;
  scope?: 'system' | 'personal';
  templateScope?: 'platform' | 'organization' | 'personal';
  createdAt?: string;
  updatedAt?: string;
}

export interface Document {
  id: string;
  fileName: string;
  fileSize: number;
  textExtractionStatus: 'pending' | 'success' | 'failed';
  extractionError?: string | null;
  extractionMs?: number | null;
}

export interface RunTimings {
  ocrMs?: number | null;
  fieldExtractionMs?: number | null;
  riskAnalysisMs?: number | null;
  analysisMs?: number | null;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens?: number;
  reasoningTokens?: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
}

export interface AnalysisTokenUsage extends TokenUsage {
  stages: {
    fieldExtraction: TokenUsage | null;
    riskAnalysis: TokenUsage | null;
  };
}

export interface AnalysisJob {
  id: string;
  documentId: string;
  userId?: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  modelName: string;
  reasoningEffort: ReasoningEffort;
  fieldTemplateId?: string | null;
  promptTemplateId?: string | null;
  createdAt: string;
  fieldExtractionMs?: number | null;
  riskAnalysisMs?: number | null;
  tokenUsage?: AnalysisTokenUsage | null;
  document: { fileName: string; extractionMs?: number | null };
  fieldTemplate?: { id: string; name: string } | null;
  promptTemplate?: { id: string; name: string } | null;
  user?: { id: string; name: string; email: string };
  feedbacks?: Array<{ userId: string; rating: number; comment?: string | null }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fieldExtractionResult: any[];
  riskAnalysisResult: { originalContractDescription: string; riskAnalysis: string };
  timings?: RunTimings;
  tokenUsage?: AnalysisTokenUsage | null;
}

export interface CompareJob {
  id: string;
  userId?: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  modelName: string;
  reasoningEffort: ReasoningEffort;
  promptTemplateId?: string | null;
  promptTemplate?: { id: string; name: string } | null;
  promptSnapshotText?: string;
  resultText?: string | null;
  analysisMs?: number | null;
  tokenUsage?: TokenUsage | null;
  tokenUsageJson?: TokenUsage | null;
  createdAt: string;
  documents: Array<{
    sortOrder: number;
    document: { id: string; fileName: string; extractionMs?: number | null };
  }>;
  user?: { id: string; name: string; email: string };
  feedbacks?: Array<{ userId: string; rating: number; comment?: string | null }>;
  errorMessage?: string | null;
}

export interface CompareResult {
  compareJobId: string;
  status: string;
  analysisResult: string;
  timings: RunTimings;
  tokenUsage: TokenUsage | null;
}

export interface CompareJobFeedback extends Omit<AnalysisJobFeedback, 'analysisJobId'> {
  compareJobId: string;
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

export interface AuditLog {
  id: string;
  userId?: string | null;
  action: string;
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' | string;
  path: string;
  targetType?: string | null;
  targetId?: string | null;
  statusCode: number;
  durationMs?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  user?: Pick<User, 'id' | 'name' | 'email' | 'role'> | null;
}

export interface AuditLogResponse {
  items: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}
