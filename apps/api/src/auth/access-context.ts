import { ForbiddenException } from '@nestjs/common';
import type { AuthUser } from './decorators/current-user.decorator';

export type TenantRole = 'super_admin' | 'admin' | 'user';
export const PLATFORM_DEFAULTS_ORGANIZATION_ID = 'platform_defaults';

export interface AccessContext {
  actorUserId: string;
  role: TenantRole;
  organizationId: string;
  isSuperAdmin: boolean;
  isCompanyAdmin: boolean;
}

export function requireOrganizationContext(user: AuthUser): AccessContext {
  const organizationId =
    user.role === 'super_admin'
      ? user.selectedOrganizationId || PLATFORM_DEFAULTS_ORGANIZATION_ID
      : user.organizationId;
  if (!organizationId) {
    throw new ForbiddenException('Organization context is required');
  }

  return {
    actorUserId: user.userId,
    role: user.role,
    organizationId,
    isSuperAdmin: user.role === 'super_admin',
    isCompanyAdmin: user.role === 'admin',
  };
}

export function requireCompanyMember(user: AuthUser): AccessContext {
  if (user.role === 'super_admin') {
    throw new ForbiddenException('Super Admin must select a company context for this operation');
  }
  return requireOrganizationContext(user);
}

export function businessWhere(user: AuthUser) {
  const ctx = requireOrganizationContext(user);
  if (ctx.role === 'user') {
    return { organizationId: ctx.organizationId, userId: ctx.actorUserId };
  }
  return { organizationId: ctx.organizationId };
}

export function ownBusinessWhere(user: AuthUser) {
  const ctx = requireOrganizationContext(user);
  return { organizationId: ctx.organizationId, userId: ctx.actorUserId };
}

export function assertCanUseAdminScope(user: AuthUser) {
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    throw new ForbiddenException('Admin access is required');
  }
}
