import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'user';
  authProvider: 'local' | 'entra';
  status: 'active' | 'disabled';
  organizationId: string | null;
  organizationName?: string | null;
  selectedOrganizationId?: string | null;
  selectedOrganizationName?: string | null;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
