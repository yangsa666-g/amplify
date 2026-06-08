import { http, HttpResponse } from 'msw';
import type { AnalysisJobFeedback, User } from '../types';
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

  http.get(api('/models'), () => HttpResponse.json(mockModels)),
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
    HttpResponse.json({ analysisJobs: mockAnalysisJobs, compareJobs: mockCompareJobs }),
  ),
  http.get(api('/history/all'), () =>
    HttpResponse.json({ analysisJobs: mockAnalysisJobs, compareJobs: mockCompareJobs }),
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
    HttpResponse.json({ text: mockDocumentText[String(params.documentId)] ?? '' }),
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
    HttpResponse.json({ count: mockNotifications.filter((item) => !item.isRead).length }),
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
    return HttpResponse.json({ ...mockAdminStats, period: period ?? mockAdminStats.period });
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
