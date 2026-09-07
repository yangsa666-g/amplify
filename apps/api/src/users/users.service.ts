import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import type { UserRoleInput } from './dto/users.dto';
import { AuthenticationSettingsService } from '../authentication-settings/authentication-settings.service';

type CreateUserInput = {
  name: string;
  email: string;
  password?: string;
  role?: UserRoleInput;
  organizationId?: string;
  authProvider: 'local' | 'entra';
};

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private authenticationSettings: AuthenticationSettingsService,
  ) {}

  private userSelect = {
    id: true,
    email: true,
    name: true,
    role: true,
    status: true,
    authProvider: true,
    organizationId: true,
    organization: { select: { id: true, name: true, status: true } },
    createdAt: true,
  };

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email }, include: { organization: true } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id }, include: { organization: true } });
  }

  async findByIdPublic(id: string, actor?: AuthUser) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.userSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    this.assertCanSeeUser(actor, user);
    return user;
  }

  async updatePasswordHash(id: string, passwordHash: string) {
    return this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  async findAll(
    actor?: AuthUser,
    filters?: { organizationId?: string; role?: UserRoleInput; status?: string; q?: string },
  ) {
    const where: any = {};

    if (actor?.role === 'admin') {
      where.organizationId = actor.organizationId;
      where.role = { in: ['admin', 'user'] };
    } else if (actor?.role === 'super_admin') {
      if (filters?.organizationId) where.organizationId = filters.organizationId;
    }

    if (filters?.role) where.role = filters.role;
    if (filters?.status) where.status = filters.status;
    if (filters?.q?.trim()) {
      const q = filters.q.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { organization: { is: { name: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      select: this.userSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createUser(input: CreateUserInput, actor?: AuthUser) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictException('A user with this email already exists');

    const role = input.role ?? 'user';
    const organizationId = this.resolveTargetOrganization(actor, role, input.organizationId);
    await this.assertOrganizationActiveForMember(role, organizationId);

    const authProvider = input.authProvider;
    if (authProvider === 'local' && !input.password) {
      throw new BadRequestException('Password is required for local users');
    }
    if (authProvider === 'local' && !(await this.authenticationSettings.isLocalAuthEnabled())) {
      throw new BadRequestException('Local authentication is disabled');
    }

    const passwordHash =
      authProvider === 'local' ? await bcrypt.hash(input.password as string, 10) : null;
    return this.prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role,
        organizationId,
        authProvider,
        status: 'active',
      },
      select: this.userSelect,
    });
  }

  async findByEntraOid(entraOid: string) {
    return this.prisma.user.findUnique({ where: { entraOid }, include: { organization: true } });
  }

  // Entra users must be created by an Admin/Super Admin first; SSO only links
  // the verified Microsoft identity to that pre-provisioned account.
  async createEntraUser() {
    throw new UnauthorizedException('Account must be provisioned before Entra SSO login');
  }

  async linkEntraOid(id: string, entraOid: string) {
    return this.prisma.user.update({
      where: { id },
      data: { entraOid, authProvider: 'entra' },
      include: { organization: true },
    });
  }

  async syncEntraProfile(id: string, name: string) {
    return this.prisma.user.update({
      where: { id },
      data: { name },
      include: { organization: true },
    });
  }

  async updateUser(
    id: string,
    data: { name?: string; email?: string; organizationId?: string },
    actor?: AuthUser,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    this.assertCanManageUser(actor, user);
    if (data.email && data.email !== user.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
      if (existing) throw new ConflictException('Email already in use');
    }

    const organizationChanged =
      data.organizationId !== undefined && data.organizationId !== user.organizationId;
    if (organizationChanged) {
      if (actor?.role !== 'super_admin') {
        throw new ForbiddenException('Only Super Admin can move users between organizations');
      }
      await this.assertOrganizationActiveForMember(user.role, data.organizationId ?? null);
      if (user.role === 'admin') {
        await this.assertNotLastActiveAdmin(user.id, user.organizationId);
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.email ? { email: data.email } : {}),
        ...(organizationChanged ? { organizationId: data.organizationId } : {}),
      },
      select: this.userSelect,
    });
    if (organizationChanged) await this.revokeRefreshTokens(id);
    return updated;
  }

  async updateStatus(id: string, status: 'active' | 'disabled', actor?: AuthUser) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    this.assertCanManageUser(actor, user);
    if (status === 'disabled') await this.assertNotLastActiveAdmin(user.id, user.organizationId);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status },
      select: this.userSelect,
    });
    await this.revokeRefreshTokens(id);
    return updated;
  }

  async updateRole(
    id: string,
    role: UserRoleInput,
    actor?: AuthUser,
    organizationId?: string | null,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    this.assertCanManageUser(actor, user);

    if (actor?.role === 'admin' && role === 'super_admin') {
      throw new ForbiddenException('Organization Admin cannot create Super Admins');
    }
    if (user.role === 'admin' && role !== 'admin') {
      await this.assertNotLastActiveAdmin(user.id, user.organizationId);
    }

    const targetOrganizationId = this.resolveTargetOrganization(
      actor,
      role,
      organizationId ?? user.organizationId,
    );
    await this.assertOrganizationActiveForMember(role, targetOrganizationId);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { role, organizationId: targetOrganizationId },
      select: this.userSelect,
    });
    await this.revokeRefreshTokens(id);
    return updated;
  }

  async deleteUser(id: string, actor?: AuthUser) {
    return this.updateStatus(id, 'disabled', actor);
  }

  private resolveTargetOrganization(
    actor: AuthUser | undefined,
    role: UserRoleInput,
    organizationId?: string | null,
  ) {
    if (role === 'super_admin') {
      if (actor?.role !== 'super_admin') {
        throw new ForbiddenException('Only Super Admin can assign Super Admin role');
      }
      return null;
    }
    if (actor?.role === 'admin') return actor.organizationId;
    if (!organizationId) throw new BadRequestException('Organization is required');
    return organizationId;
  }

  private async assertOrganizationActiveForMember(
    role: UserRoleInput,
    organizationId: string | null,
  ) {
    if (role === 'super_admin') return;
    if (!organizationId) throw new BadRequestException('Organization is required');
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new BadRequestException('Organization not found');
    if (org.status !== 'active') throw new BadRequestException('Organization is disabled');
  }

  private assertCanSeeUser(
    actor: AuthUser | undefined,
    user: { organizationId: string | null; role: string },
  ) {
    if (!actor || actor.role === 'super_admin') return;
    if (user.role === 'super_admin' || user.organizationId !== actor.organizationId) {
      throw new ForbiddenException('Cannot access user outside your organization');
    }
  }

  private assertCanManageUser(
    actor: AuthUser | undefined,
    user: { id: string; organizationId: string | null; role: string },
  ) {
    if (!actor || actor.role === 'super_admin') return;
    if (user.role === 'super_admin' || user.organizationId !== actor.organizationId) {
      throw new ForbiddenException('Cannot manage user outside your organization');
    }
  }

  private async assertNotLastActiveAdmin(userId: string, organizationId: string | null) {
    if (!organizationId) return;
    const activeAdminCount = await this.prisma.user.count({
      where: { organizationId, role: 'admin', status: 'active', id: { not: userId } },
    });
    if (activeAdminCount === 0) {
      throw new BadRequestException('Each organization must keep at least one active Admin');
    }
  }

  private async revokeRefreshTokens(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }
}
