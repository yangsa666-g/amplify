import type {
  AdminStats,
  AnalysisJob,
  AnalysisJobFeedback,
  CompareJob,
  FieldTemplate,
  Model,
  Notification,
  PromptTemplate,
  TemplateRequest,
  User,
} from '../types';
import type { ApiKeyInfo } from '../api/apiKeys';

export const mockUser: User = {
  id: 'mock-user-admin',
  email: 'dev@example.com',
  name: 'Dev Admin',
  role: 'admin',
  authProvider: 'local',
  status: 'active',
  createdAt: '2026-06-01T03:00:00.000Z',
};

export const mockModels: Model[] = [
  {
    name: 'gpt-5.4-mini',
    label: 'GPT-5.4 Mini',
    provider: 'openai',
    icon: 'openai',
    enabled: true,
    isDefault: true,
    supportsReasoning: true,
    reasoningEfforts: ['none', 'low', 'medium', 'high', 'xhigh'],
    defaultReasoningEffort: 'medium',
    sortOrder: 10,
    source: 'environment',
  },
  {
    name: 'gpt-5.4',
    label: 'GPT-5.4',
    provider: 'openai',
    icon: 'openai',
    enabled: true,
    isDefault: false,
    supportsReasoning: true,
    reasoningEfforts: ['none', 'low', 'medium', 'high', 'xhigh'],
    defaultReasoningEffort: 'medium',
    sortOrder: 10,
    source: 'environment',
  },
  {
    name: 'claude-sonnet-4-5',
    label: 'Claude Sonnet 4.5',
    provider: 'claude',
    icon: 'claude',
    enabled: true,
    isDefault: false,
    supportsReasoning: true,
    reasoningEfforts: ['none', 'low', 'medium', 'high', 'xhigh'],
    defaultReasoningEffort: 'medium',
    sortOrder: 20,
    source: 'environment',
  },
];

export const mockFieldTemplates: FieldTemplate[] = [
  {
    id: 'mock-field-template-default',
    name: 'Default Contract Fields',
    isSystem: true,
    isDefault: true,
    scope: 'system',
    items: [
      {
        id: 'mock-field-title',
        fieldName: 'Contract Title',
        fieldDescription: 'The official title or name of the contract',
        sortOrder: 1,
      },
      {
        id: 'mock-field-parties',
        fieldName: 'Parties',
        fieldDescription: 'All parties involved in the contract',
        sortOrder: 2,
      },
      {
        id: 'mock-field-value',
        fieldName: 'Contract Value',
        fieldDescription: 'Total monetary value or consideration',
        sortOrder: 3,
      },
    ],
    createdAt: '2026-06-01T03:00:00.000Z',
    updatedAt: '2026-06-01T03:00:00.000Z',
  },
];

export const mockPromptTemplates: PromptTemplate[] = [
  {
    id: 'mock-prompt-template-default',
    name: 'Default Risk Analysis Prompt',
    content: 'Review {contract_text} and produce a structured risk analysis.',
    isSystem: true,
    isDefault: true,
    scope: 'system',
    templateType: 'risk_analysis',
    createdAt: '2026-06-01T03:00:00.000Z',
    updatedAt: '2026-06-01T03:00:00.000Z',
  },
];

export const mockAnalysisJobs: AnalysisJob[] = [
  {
    id: 'mock-analysis-success',
    documentId: 'mock-document-success',
    userId: mockUser.id,
    status: 'success',
    modelName: 'gpt-5.4-mini',
    reasoningEffort: 'low',
    fieldTemplateId: 'mock-field-template-default',
    promptTemplateId: 'mock-prompt-template-default',
    createdAt: '2026-06-05T03:13:00.000Z',
    fieldExtractionMs: 19400,
    riskAnalysisMs: 23800,
    document: {
      fileName: 'CTS A.docx',
      extractionMs: 73,
    },
    user: {
      id: mockUser.id,
      name: mockUser.name,
      email: mockUser.email,
    },
    feedbacks: [{ userId: mockUser.id, rating: 1, comment: 'Looks good for UI review.' }],
    fieldExtractionResult: {
      id: 'mock-field-result-success',
      resultJson: [
        {
          field: 'Contract Title',
          extracted_value: 'Cloud Transformation Services Agreement',
          confidence: 0.98,
          evidence: 'The first page identifies the agreement title.',
          comments: 'Clear title match.',
        },
        {
          field: 'Parties',
          extracted_value: ['Contoso Ltd.', 'Fabrikam Services LLC'],
          confidence: 0.94,
          evidence: 'Both legal names appear in the introductory paragraph.',
          comments: 'Two-party agreement.',
        },
        {
          field: 'Contract Value',
          extracted_value: '$250,000',
          confidence: 0.89,
          evidence: 'Fees section lists a total project cap of $250,000.',
          comments: 'Subject to milestone acceptance.',
        },
      ],
    },
    riskAnalysisResult: {
      id: 'mock-risk-result-success',
      resultText:
        '## Risk Summary\n\n- **Payment terms:** Milestone acceptance language should define objective acceptance criteria.\n- **Liability cap:** Confirm whether indirect damages are excluded and whether data breach claims are carved out.\n- **Termination:** Add cure periods for material breach.\n\n## Recommendation\n\nClarify acceptance testing, data security obligations, and termination notice requirements before signature.',
      resultJson: {
        originalContractDescription: 'A services agreement for a cloud transformation project.',
        riskAnalysis: 'Moderate operational and commercial risk.',
      },
    },
  },
  {
    id: 'mock-analysis-long-id-00000000000000000000000000000001',
    documentId: 'mock-document-long-name',
    userId: mockUser.id,
    status: 'success',
    modelName: 'claude-sonnet-4-5',
    reasoningEffort: 'high',
    createdAt: '2026-06-04T09:45:00.000Z',
    fieldExtractionMs: 53210,
    riskAnalysisMs: 66100,
    document: {
      fileName:
        'Very Long Master Services Agreement Name Used To Validate Responsive Header Wrapping.docx',
      extractionMs: 2400,
    },
    user: {
      id: mockUser.id,
      name: mockUser.name,
      email: mockUser.email,
    },
    feedbacks: [],
    fieldExtractionResult: {
      id: 'mock-field-result-long',
      resultJson: [
        {
          field: 'Contract Title',
          extracted_value: 'Very Long Master Services Agreement',
          confidence: 0.91,
          evidence: 'Title block on page 1.',
          comments: '',
        },
      ],
    },
    riskAnalysisResult: {
      id: 'mock-risk-result-long',
      resultText:
        '## Responsive Fixture\n\nThis mock validates long filenames and long result IDs.',
    },
  },
  {
    id: 'mock-analysis-failed',
    documentId: 'mock-document-failed',
    userId: mockUser.id,
    status: 'failed',
    modelName: 'gpt-5.4',
    reasoningEffort: 'medium',
    createdAt: '2026-06-03T12:20:00.000Z',
    document: {
      fileName: 'Failed OCR Sample.pdf',
      extractionMs: null,
    },
    user: {
      id: mockUser.id,
      name: mockUser.name,
      email: mockUser.email,
    },
    feedbacks: [],
    fieldExtractionResult: null,
    riskAnalysisResult: null,
    errorMessage: 'Mock failure for empty and failed states.',
  },
];

export const mockCompareJobs: CompareJob[] = [
  {
    id: 'mock-compare-success',
    status: 'success',
    diffMode: 'side_by_side',
    createdAt: '2026-06-05T05:10:00.000Z',
    oldDocument: { fileName: 'MSA v1.docx' },
    newDocument: { fileName: 'MSA v2.docx' },
    user: {
      id: mockUser.id,
      name: mockUser.name,
      email: mockUser.email,
    },
    diffResultJson: {
      chunks: [
        { type: 'unchanged', value: 'The supplier shall provide services.', lines: [] },
        { type: 'removed', value: 'Payment is due within 60 days.', lines: [] },
        { type: 'added', value: 'Payment is due within 30 days.', lines: [] },
      ],
      stats: { added: 1, removed: 1, unchanged: 1 },
    },
  },
];

export const mockFeedbacks: Record<string, AnalysisJobFeedback[]> = {
  'mock-analysis-success': [
    {
      id: 'mock-feedback-1',
      analysisJobId: 'mock-analysis-success',
      userId: mockUser.id,
      rating: 1,
      comment: 'Useful analysis.',
      createdAt: '2026-06-05T04:00:00.000Z',
      user: { id: mockUser.id, name: mockUser.name },
    },
  ],
};

export const mockDocumentText: Record<string, string> = {
  'mock-document-success':
    '# Cloud Transformation Services Agreement\n\nThis is mock OCR text for UI development. It includes several paragraphs so the OCR tab has scrollable content.\n\n## Fees\n\nThe total project cap is $250,000, payable on milestone acceptance.',
  'mock-document-long-name':
    '# Very Long Master Services Agreement\n\nMock OCR text for validating long document names and responsive layout behavior.',
  'mock-document-failed': '',
};

export const mockNotifications: Notification[] = [
  {
    id: 'mock-notification-1',
    userId: mockUser.id,
    type: 'template_request_approved',
    title: 'Template request approved',
    body: 'Your mock template request was approved.',
    isRead: false,
    requestId: 'mock-request-1',
    createdAt: '2026-06-05T07:00:00.000Z',
  },
];

export const mockTemplateRequests: TemplateRequest[] = [
  {
    id: 'mock-request-1',
    userId: mockUser.id,
    templateKind: 'field',
    fieldTemplateId: 'mock-field-template-default',
    status: 'approved',
    createdAt: '2026-06-05T06:00:00.000Z',
    updatedAt: '2026-06-05T07:00:00.000Z',
    user: { id: mockUser.id, name: mockUser.name, email: mockUser.email },
    fieldTemplate: mockFieldTemplates[0],
  },
];

export const mockUsers: User[] = [
  mockUser,
  {
    id: 'mock-user-analyst',
    email: 'analyst@example.com',
    name: 'Dev Analyst',
    role: 'user',
    authProvider: 'local',
    status: 'active',
    createdAt: '2026-06-02T03:00:00.000Z',
  },
];

export const mockApiKey: ApiKeyInfo = {
  id: 'mock-api-key',
  keyPrefix: 'amp_mock',
  expiresAt: null,
  createdAt: '2026-06-01T03:00:00.000Z',
  createdBy: mockUser.name,
};

export const mockAdminStats: AdminStats = {
  period: '7d',
  analysis: {
    total: mockAnalysisJobs.length,
    successRate: 67,
    statusBreakdown: { pending: 0, running: 0, success: 2, failed: 1 },
  },
  compare: {
    total: mockCompareJobs.length,
    successRate: 100,
    statusBreakdown: { pending: 0, running: 0, success: 1, failed: 0 },
  },
  feedback: {
    total: 1,
    thumbsUp: 1,
    thumbsDown: 0,
    positiveRate: 100,
  },
  users: {
    activeCount: mockUsers.length,
    newCount: 1,
    topUsers: [
      {
        userId: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        analysisCount: 3,
        compareCount: 1,
      },
    ],
  },
  modelUsage: [
    { modelName: 'gpt-5.4-mini', count: 1 },
    { modelName: 'gpt-5.4', count: 1 },
    { modelName: 'claude-sonnet-4-5', count: 1 },
  ],
  dailyVolume: [
    { date: '2026-06-03', analyses: 1, compares: 0 },
    { date: '2026-06-04', analyses: 1, compares: 0 },
    { date: '2026-06-05', analyses: 1, compares: 1 },
  ],
};
