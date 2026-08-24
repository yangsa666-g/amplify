import { http, HttpResponse } from 'msw';
import type { AnalysisJobFeedback, Model, User } from '../types';
import {
  mockAdminStats,
  mockAnalysisJobs,
  mockApiKey,
  mockCompareJobs,
  mockDocumentText,
  mockFeedbacks,
  mockFieldTemplates,
  mockModels,
  mockNotifications,
  mockPromptTemplates,
  mockTemplateRequests,
  mockUser,
  mockUsers,
} from './fixtures';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const api = (path: string) => `${API_BASE_URL}${path}`;

const mockTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
};

const authResponse = {
  ...mockTokens,
  user: mockUser,
};

const MODEL_CATALOG_STORAGE_KEY = 'mock-model-catalog';

const readMockModelCatalog = () => {
  if (typeof localStorage === 'undefined') return mockModels.map((model) => ({ ...model }));
  try {
    const stored = localStorage.getItem(MODEL_CATALOG_STORAGE_KEY);
    return stored
      ? (JSON.parse(stored) as typeof mockModels)
      : mockModels.map((model) => ({ ...model }));
  } catch {
    return mockModels.map((model) => ({ ...model }));
  }
};

const writeMockModelCatalog = () => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(MODEL_CATALOG_STORAGE_KEY, JSON.stringify(mockModelCatalog));
};

let mockModelCatalog = readMockModelCatalog();

const jsonNotFound = (message = 'Mock resource not found') =>
  HttpResponse.json({ message }, { status: 404 });

const getAnalysisJob = (id: string) => mockAnalysisJobs.find((job) => job.id === id);

const getCompareJob = (id: string) => mockCompareJobs.find((job) => job.id === id);

export const handlers = [
  http.get(api('/auth/entra/enabled'), () => HttpResponse.json({ enabled: false })),
  http.post(api('/auth/login'), () => HttpResponse.json(authResponse)),
  http.post(api('/auth/refresh'), () => HttpResponse.json(mockTokens)),
  http.get(api('/auth/me'), () => HttpResponse.json(mockUser)),
  http.post(api('/auth/logout'), () => new HttpResponse(null, { status: 204 })),
  http.post(api('/auth/change-password'), () => new HttpResponse(null, { status: 204 })),

  http.get(api('/models'), () =>
    HttpResponse.json(
      mockModelCatalog
        .filter((model) => model.enabled !== false)
        .sort((a, b) => {
          return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label);
        })
        .map((model) => ({
          name: model.name,
          label: model.label,
          provider: model.provider,
          icon: model.icon,
          enabled: model.enabled,
          isDefault: model.isDefault,
          supportsReasoning: model.supportsReasoning,
          reasoningEfforts: model.reasoningEfforts,
          defaultReasoningEffort: model.defaultReasoningEffort,
          sortOrder: model.sortOrder,
        })),
    ),
  ),
  http.get(api('/admin/models'), () => HttpResponse.json(mockModelCatalog)),
  http.get(api('/admin/models/configuration-status'), () =>
    HttpResponse.json({ customModelsEnabled: true }),
  ),
  http.post(api('/admin/models/test-connection'), async () =>
    HttpResponse.json({ ok: true as const, latencyMs: 125 }),
  ),
  http.post(api('/admin/models'), async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      label: string;
      endpoint: string;
      upstreamModelName: string;
      apiProtocol: 'chat_completions' | 'responses';
      supportsReasoning: boolean;
      enabled: boolean;
    };
    if (mockModelCatalog.some((model) => model.name === body.name)) {
      return HttpResponse.json({ message: 'Model name is already configured' }, { status: 409 });
    }
    const created: Model = {
      name: body.name,
      label: body.label,
      provider: 'openai',
      icon: 'openai',
      enabled: body.enabled,
      isDefault: false,
      supportsReasoning: body.supportsReasoning,
      reasoningEfforts: body.supportsReasoning
        ? ['none', 'low', 'medium', 'high', 'xhigh']
        : ['none'],
      defaultReasoningEffort: body.supportsReasoning ? 'medium' : 'none',
      sortOrder: Math.max(0, ...mockModelCatalog.map((model) => model.sortOrder ?? 0)) + 10,
      source: 'custom',
      endpoint: body.endpoint,
      upstreamModelName: body.upstreamModelName,
      apiProtocol: body.apiProtocol,
      hasApiKey: true,
      credentialStatus: 'ready',
    };
    mockModelCatalog = [...mockModelCatalog, created];
    writeMockModelCatalog();
    return HttpResponse.json(created, { status: 201 });
  }),
  http.patch(api('/admin/models/order'), async ({ request }) => {
    const body = (await request.json()) as {
      models: Array<{ modelName: string; sortOrder: number }>;
    };
    const orderByName = new Map(body.models.map((item) => [item.modelName, item.sortOrder]));
    mockModelCatalog = mockModelCatalog
      .map((item) => ({
        ...item,
        sortOrder: orderByName.get(item.name) ?? item.sortOrder,
      }))
      .sort((a, b) => {
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label);
      });
    writeMockModelCatalog();
    return HttpResponse.json(mockModelCatalog);
  }),
  http.patch(api('/admin/models/:modelName'), async ({ params, request }) => {
    const modelName = decodeURIComponent(String(params.modelName));
    const body = (await request.json()) as Partial<(typeof mockModelCatalog)[number]> & {
      apiKey?: string;
    };
    const { apiKey: _apiKey, ...safeBody } = body;
    const model = mockModelCatalog.find((item) => item.name === modelName);
    if (!model) return jsonNotFound('Model is not configured');

    if (safeBody.isDefault) {
      mockModelCatalog = mockModelCatalog.map((item) => ({
        ...item,
        isDefault: false,
      }));
    }

    mockModelCatalog = mockModelCatalog.map((item) =>
      item.name === modelName
        ? {
            ...item,
            ...safeBody,
            hasApiKey: item.hasApiKey || Boolean(_apiKey),
            enabled: safeBody.isDefault ? true : (safeBody.enabled ?? item.enabled),
            isDefault: safeBody.isDefault ?? item.isDefault,
          }
        : item,
    );
    writeMockModelCatalog();

    return HttpResponse.json(mockModelCatalog.find((item) => item.name === modelName));
  }),
  http.delete(api('/admin/models/:modelName'), ({ params }) => {
    const modelName = decodeURIComponent(String(params.modelName));
    const model = mockModelCatalog.find((item) => item.name === modelName);
    if (!model) return jsonNotFound('Model is not configured');
    if (model.source !== 'custom') {
      return HttpResponse.json(
        { message: 'Environment models cannot be deleted' },
        { status: 400 },
      );
    }
    mockModelCatalog = mockModelCatalog.filter((item) => item.name !== modelName);
    writeMockModelCatalog();
    return HttpResponse.json({ deleted: true });
  }),
  http.get(api('/field-templates'), () => HttpResponse.json(mockFieldTemplates)),
  http.get(api('/field-templates/:id'), ({ params }) => {
    const template = mockFieldTemplates.find((item) => item.id === params.id);
    return template ? HttpResponse.json(template) : jsonNotFound();
  }),
  http.get(api('/prompt-templates'), () => HttpResponse.json(mockPromptTemplates)),
  http.get(api('/prompt-templates/:id'), ({ params }) => {
    const template = mockPromptTemplates.find((item) => item.id === params.id);
    return template ? HttpResponse.json(template) : jsonNotFound();
  }),
  http.get(api('/admin/field-templates'), () => HttpResponse.json(mockFieldTemplates)),
  http.get(api('/admin/prompt-templates'), () => HttpResponse.json(mockPromptTemplates)),

  http.get(api('/history'), () =>
    HttpResponse.json({
      analysisJobs: mockAnalysisJobs,
      compareJobs: mockCompareJobs,
    }),
  ),
  http.get(api('/history/all'), () =>
    HttpResponse.json({
      analysisJobs: mockAnalysisJobs,
      compareJobs: mockCompareJobs,
    }),
  ),

  http.get(api('/analysis/recent'), () => HttpResponse.json(mockAnalysisJobs)),
  http.get(api('/analysis/:jobId/feedback'), ({ params }) =>
    HttpResponse.json(mockFeedbacks[String(params.jobId)] ?? []),
  ),
  http.post(api('/analysis/:jobId/feedback'), async ({ params, request }) => {
    const body = (await request.json()) as { rating: number; comment?: string };
    const jobId = String(params.jobId);
    const feedback: AnalysisJobFeedback = {
      id: `mock-feedback-${Date.now()}`,
      analysisJobId: jobId,
      userId: mockUser.id,
      rating: body.rating,
      comment: body.comment,
      createdAt: new Date().toISOString(),
      user: { id: mockUser.id, name: mockUser.name },
    };
    mockFeedbacks[jobId] = [feedback, ...(mockFeedbacks[jobId] ?? [])];
    return HttpResponse.json(feedback);
  }),
  http.get(api('/analysis/:jobId'), ({ params }) => {
    const job = getAnalysisJob(String(params.jobId));
    return job ? HttpResponse.json(job) : jsonNotFound('Analysis job not found');
  }),
  http.post(api('/analysis/run'), () =>
    HttpResponse.json({
      analysisJobId: 'mock-analysis-success',
      status: 'success',
      fieldExtractionResult: mockAnalysisJobs[0].fieldExtractionResult?.resultJson ?? [],
      riskAnalysisResult: mockAnalysisJobs[0].riskAnalysisResult?.resultJson ?? {
        originalContractDescription: 'Mock contract',
        riskAnalysis: 'Mock risk analysis',
      },
      timings: {
        ocrMs: mockAnalysisJobs[0].document.extractionMs,
        fieldExtractionMs: mockAnalysisJobs[0].fieldExtractionMs,
        riskAnalysisMs: mockAnalysisJobs[0].riskAnalysisMs,
      },
    }),
  ),

  http.get(api('/documents/:documentId/text'), ({ params }) =>
    HttpResponse.json({
      text: mockDocumentText[String(params.documentId)] ?? '',
    }),
  ),
  http.get(api('/documents/:documentId/download'), ({ params }) =>
    HttpResponse.text(`Mock original document for ${String(params.documentId)}`, {
      headers: { 'Content-Type': 'application/octet-stream' },
    }),
  ),
  http.post(api('/documents/upload'), async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('file');
    const fileName = file instanceof File ? file.name : 'mock-upload.docx';
    const fileSize = file instanceof File ? file.size : 1024;
    return HttpResponse.json({
      id: 'mock-uploaded-document',
      fileName,
      fileSize,
      textExtractionStatus: 'success',
      extractionMs: 120,
    });
  }),

  http.get(api('/compare/recent'), () => HttpResponse.json(mockCompareJobs)),
  http.get(api('/compare/:compareId'), ({ params }) => {
    const job = getCompareJob(String(params.compareId));
    return job ? HttpResponse.json(job) : jsonNotFound('Compare job not found');
  }),
  http.post(api('/compare/run'), () =>
    HttpResponse.json({
      compareJobId: 'mock-compare-success',
      status: 'success',
      diffMode: 'side_by_side',
      diffResult: mockCompareJobs[0].diffResultJson,
    }),
  ),

  http.get(api('/notifications'), () => HttpResponse.json(mockNotifications)),
  http.get(api('/notifications/unread-count'), () =>
    HttpResponse.json({
      count: mockNotifications.filter((item) => !item.isRead).length,
    }),
  ),
  http.put(api('/notifications/:id/read'), ({ params }) => {
    const notification = mockNotifications.find((item) => item.id === params.id);
    if (notification) notification.isRead = true;
    return new HttpResponse(null, { status: 204 });
  }),
  http.put(api('/notifications/read-all'), () => {
    mockNotifications.forEach((item) => {
      item.isRead = true;
    });
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(api('/template-requests'), () => HttpResponse.json(mockTemplateRequests)),
  http.post(api('/template-requests'), () => HttpResponse.json(mockTemplateRequests[0])),
  http.get(api('/admin/template-requests'), () => HttpResponse.json(mockTemplateRequests)),
  http.put(api('/admin/template-requests/:id/approve'), () =>
    HttpResponse.json(mockTemplateRequests[0]),
  ),
  http.put(api('/admin/template-requests/:id/reject'), () =>
    HttpResponse.json({ ...mockTemplateRequests[0], status: 'rejected' }),
  ),

  http.get(api('/admin/dashboard/stats'), ({ request }) => {
    const period = new URL(request.url).searchParams.get('period');
    return HttpResponse.json({
      ...mockAdminStats,
      period: period ?? mockAdminStats.period,
    });
  }),
  http.get(api('/admin/users'), () => HttpResponse.json(mockUsers)),
  http.post(api('/admin/users'), async ({ request }) => {
    const body = (await request.json()) as Pick<User, 'email' | 'name' | 'role'>;
    return HttpResponse.json({
      id: `mock-user-${Date.now()}`,
      email: body.email,
      name: body.name,
      role: body.role,
      authProvider: 'local',
      status: 'active',
      createdAt: new Date().toISOString(),
    });
  }),
  http.patch(api('/admin/users/:id'), async ({ params, request }) => {
    const body = (await request.json()) as Partial<User>;
    const user = mockUsers.find((item) => item.id === params.id);
    return user ? HttpResponse.json({ ...user, ...body }) : jsonNotFound('User not found');
  }),
  http.patch(api('/admin/users/:id/role'), async ({ params, request }) => {
    const body = (await request.json()) as Pick<User, 'role'>;
    const user = mockUsers.find((item) => item.id === params.id);
    return user ? HttpResponse.json({ ...user, role: body.role }) : jsonNotFound('User not found');
  }),
  http.patch(api('/admin/users/:id/status'), async ({ params, request }) => {
    const body = (await request.json()) as Pick<User, 'status'>;
    const user = mockUsers.find((item) => item.id === params.id);
    return user
      ? HttpResponse.json({ ...user, status: body.status })
      : jsonNotFound('User not found');
  }),
  http.delete(api('/admin/users/:id'), () => new HttpResponse(null, { status: 204 })),
  http.get(api('/admin/api-keys'), () => HttpResponse.json(mockApiKey)),
  http.post(api('/admin/api-keys'), () =>
    HttpResponse.json({ ...mockApiKey, rawKey: 'amp_mock_1234567890' }),
  ),
  http.delete(api('/admin/api-keys/:id'), () => new HttpResponse(null, { status: 204 })),
];
