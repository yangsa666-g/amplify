import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';

interface RequestUser {
  id?: string;
  userId?: string;
  email?: string;
  role?: string;
  organizationId?: string | null;
  selectedOrganizationId?: string | null;
}

interface AuditRequest {
  user?: RequestUser;
  originalUrl?: string;
  url: string;
  method: string;
  params: Record<string, string>;
  query?: Record<string, unknown>;
  ip?: string;
  route?: { path?: string };
  file?: { originalname?: string; mimetype?: string; size?: number };
  get(name: string): string | undefined;
}

interface AuditResponse {
  statusCode: number;
}

interface ActionInfo {
  action: string;
  targetType?: string;
  targetId?: string;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest<AuditRequest>();
    const response = context.switchToHttp().getResponse<AuditResponse>();
    const userId = request.user?.userId ?? request.user?.id;

    if (!userId || this.shouldSkip(request)) {
      return next.handle();
    }

    const startedAt = Date.now();
    let recorded = false;

    const write = (statusCode: number) => {
      if (recorded) return;
      recorded = true;
      const path = this.pathWithoutQuery(request.originalUrl ?? request.url);
      const actionInfo = this.getActionInfo(request.method, path, request.params);

      void this.auditService.record({
        userId,
        organizationId:
          request.user?.selectedOrganizationId ?? request.user?.organizationId ?? undefined,
        action: actionInfo.action,
        method: request.method,
        path,
        targetType: actionInfo.targetType,
        targetId: actionInfo.targetId,
        statusCode,
        durationMs: Date.now() - startedAt,
        ipAddress: this.clientIp(request),
        userAgent: request.get('user-agent'),
        metadata: this.buildMetadata(request),
      });
    };

    return next.handle().pipe(
      tap({
        next: () => write(response.statusCode),
        error: (error: unknown) => write(this.statusCodeForError(error, response.statusCode)),
      }),
    );
  }

  private shouldSkip(request: AuditRequest) {
    const path = this.pathWithoutQuery(request.originalUrl ?? request.url);
    return (
      path === '/health' ||
      path === '/auth/refresh' ||
      path === '/auth/entra/enabled' ||
      path === '/notifications/unread-count' ||
      (request.method === 'GET' &&
        (path === '/admin/audit' ||
          path === '/admin/audit/actions' ||
          path === '/admin/audit/retention')) ||
      path.startsWith('/auth/entra/')
    );
  }

  private getActionInfo(method: string, path: string, params: Record<string, string>): ActionInfo {
    const id = params.id;
    const modelName = params.modelName;

    if (method === 'POST' && path === '/auth/login') return { action: 'auth.login' };
    if (method === 'GET' && path === '/auth/me') return { action: 'auth.me' };
    if (method === 'POST' && path === '/auth/change-password') {
      return { action: 'auth.change_password' };
    }

    if (method === 'POST' && path === '/documents/upload') {
      return { action: 'document.upload', targetType: 'document' };
    }
    if (path.match(/^\/documents\/[^/]+\/text$/)) {
      return { action: 'document.view_text', targetType: 'document', targetId: id };
    }
    if (path.match(/^\/documents\/[^/]+\/download$/)) {
      return { action: 'document.download', targetType: 'document', targetId: id };
    }
    if (path.match(/^\/documents\/[^/]+$/)) {
      return { action: 'document.view', targetType: 'document', targetId: id };
    }

    if (method === 'POST' && path === '/analysis/run') return { action: 'analysis.run' };
    if (method === 'GET' && path === '/analysis/recent') return { action: 'analysis.list_recent' };
    if (path.match(/^\/analysis\/[^/]+\/feedback$/)) {
      return {
        action: method === 'POST' ? 'analysis.feedback' : 'analysis.view_feedback',
        targetType: 'analysis',
        targetId: id,
      };
    }
    if (path.match(/^\/analysis\/[^/]+$/)) {
      return { action: 'analysis.view', targetType: 'analysis', targetId: id };
    }

    if (method === 'POST' && path === '/compare/run') return { action: 'compare.run' };
    if (method === 'GET' && path === '/compare/recent') return { action: 'compare.list_recent' };
    if (path.match(/^\/compare\/[^/]+$/)) {
      return { action: 'compare.view', targetType: 'compare', targetId: id };
    }

    if (path === '/history') return { action: 'history.list' };
    if (path === '/history/all') return { action: 'history.list_all' };

    if (path.startsWith('/admin/users')) {
      return this.adminUserAction(method, path, id);
    }
    if (path.startsWith('/admin/models')) {
      if (path === '/admin/models/test-connection') {
        return { action: 'admin.model.test', targetType: 'model' };
      }
      if (path === '/admin/models/configuration-status') {
        return { action: 'admin.model.configuration_status', targetType: 'model' };
      }
      return this.basicAction(method, 'admin.model', modelName);
    }
    if (path.startsWith('/admin/dashboard')) return { action: 'admin.dashboard.view' };
    if (method === 'POST' && path === '/admin/audit/cleanup') {
      return { action: 'admin.audit.cleanup', targetType: 'audit_log' };
    }
    if (path.startsWith('/admin/api-keys')) return this.basicAction(method, 'admin.api_key', id);
    if (path.startsWith('/admin/template-requests')) {
      return this.basicAction(method, 'admin.template_request', id);
    }
    if (path.startsWith('/admin/field-templates')) {
      return this.basicAction(method, 'admin.field_template', id);
    }
    if (path.startsWith('/admin/prompt-templates')) {
      return this.basicAction(method, 'admin.prompt_template', id);
    }

    if (path.startsWith('/field-templates')) return this.basicAction(method, 'field_template', id);
    if (path.startsWith('/prompt-templates'))
      return this.basicAction(method, 'prompt_template', id);
    if (path.startsWith('/template-requests'))
      return this.basicAction(method, 'template_request', id);
    if (path.startsWith('/notifications')) return this.basicAction(method, 'notification', id);

    return { action: `${method.toLowerCase()}.${this.normalizePath(path)}` };
  }

  private adminUserAction(method: string, path: string, id?: string): ActionInfo {
    if (method === 'GET' && path === '/admin/users') return { action: 'admin.user.list' };
    if (method === 'POST' && path === '/admin/users') return { action: 'admin.user.create' };
    if (path.endsWith('/status')) {
      return { action: 'admin.user.update_status', targetType: 'user', targetId: id };
    }
    if (path.endsWith('/role')) {
      return { action: 'admin.user.update_role', targetType: 'user', targetId: id };
    }
    if (method === 'DELETE')
      return { action: 'admin.user.delete', targetType: 'user', targetId: id };
    if (method === 'PATCH')
      return { action: 'admin.user.update', targetType: 'user', targetId: id };
    return { action: 'admin.user.view', targetType: 'user', targetId: id };
  }

  private basicAction(method: string, resource: string, id?: string): ActionInfo {
    const verb =
      method === 'GET'
        ? id
          ? 'view'
          : 'list'
        : method === 'POST'
          ? 'create'
          : method === 'PATCH' || method === 'PUT'
            ? 'update'
            : method === 'DELETE'
              ? 'delete'
              : method.toLowerCase();
    return { action: `${resource}.${verb}`, targetType: resource.split('.').pop(), targetId: id };
  }

  private buildMetadata(request: AuditRequest): Prisma.InputJsonObject | undefined {
    if (request.file) {
      return {
        fileName: request.file.originalname,
        fileType: request.file.mimetype,
        fileSize: request.file.size,
      };
    }

    const queryKeys = Object.keys(request.query ?? {});
    if (queryKeys.length) return { queryKeys };

    return undefined;
  }

  private pathWithoutQuery(url: string) {
    return url.split('?')[0] || '/';
  }

  private normalizePath(path: string) {
    return path
      .replace(/^\//, '')
      .replace(/\/[A-Za-z0-9_-]{8,}(?=\/|$)/g, '/:id')
      .replace(/\//g, '.');
  }

  private statusCodeForError(error: unknown, fallback: number) {
    if (typeof error === 'object' && error !== null) {
      const candidate =
        'status' in error ? error.status : 'statusCode' in error ? error.statusCode : undefined;
      if (typeof candidate === 'number') return candidate;
    }
    return fallback >= 400 ? fallback : 500;
  }

  private clientIp(request: AuditRequest) {
    const forwarded = request.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0]?.trim();
    return request.ip;
  }
}
