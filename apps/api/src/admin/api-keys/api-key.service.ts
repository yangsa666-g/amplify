import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../auth/decorators/current-user.decorator';
import { requireOrganizationContext } from '../../auth/access-context';

export type ExpiryOption = '1m' | '3m' | '6m' | '1y' | 'never';

@Injectable()
export class ApiKeyService {
  constructor(private prisma: PrismaService) {}

  private hashKey(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private computeExpiry(option: ExpiryOption): Date | null {
    if (option === 'never') return null;
    const now = new Date();
    const map: Record<Exclude<ExpiryOption, 'never'>, () => Date> = {
      '1m': () => new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()),
      '3m': () => new Date(now.getFullYear(), now.getMonth() + 3, now.getDate()),
      '6m': () => new Date(now.getFullYear(), now.getMonth() + 6, now.getDate()),
      '1y': () => new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
    };
    return map[option]();
  }

  async getCurrent(user: AuthUser) {
    const ctx = requireOrganizationContext(user);
    const key = await this.prisma.apiKey.findUnique({
      where: { organizationId: ctx.organizationId },
    });
    if (!key) return null;
    return {
      id: key.id,
      keyPrefix: key.keyPrefix,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
      createdBy: key.createdBy,
    };
  }

  async create(user: AuthUser, expiry: ExpiryOption = '1m') {
    const ctx = requireOrganizationContext(user);
    const existing = await this.prisma.apiKey.findUnique({
      where: { organizationId: ctx.organizationId },
    });
    if (existing) {
      throw new ConflictException(
        'An API key already exists. Delete it before creating a new one.',
      );
    }

    const rawKey = `amp_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = this.hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, 12);
    const expiresAt = this.computeExpiry(expiry);

    await this.prisma.apiKey.create({
      data: {
        keyHash,
        keyPrefix,
        expiresAt,
        createdBy: user.userId,
        organizationId: ctx.organizationId,
      },
    });

    return { rawKey, keyPrefix, expiresAt };
  }

  async delete(user: AuthUser, id: string) {
    const ctx = requireOrganizationContext(user);
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key) throw new NotFoundException('API key not found');
    if (key.organizationId !== ctx.organizationId) throw new NotFoundException('API key not found');
    await this.prisma.apiKey.delete({ where: { id } });
  }

  async validateKey(rawKey: string): Promise<{
    userId: string;
    role: 'user';
    email: string;
    name: string;
    authProvider: 'local' | 'entra';
    status: 'active';
    organizationId: string;
    organizationName: string;
    selectedOrganizationId: string;
    selectedOrganizationName: string;
  } | null> {
    if (!rawKey?.startsWith('amp_')) return null;
    const hash = this.hashKey(rawKey);
    const key = await this.prisma.apiKey.findUnique({
      where: { keyHash: hash },
      include: {
        organization: true,
        creator: {
          select: { id: true, email: true, name: true, authProvider: true, status: true },
        },
      },
    });
    if (!key) return null;
    if (key.expiresAt && key.expiresAt < new Date()) return null;
    if (key.organization.status !== 'active' || key.creator.status !== 'active') return null;
    return {
      userId: key.creator.id,
      email: key.creator.email,
      name: key.creator.name,
      role: 'user',
      authProvider: key.creator.authProvider,
      status: 'active',
      organizationId: key.organizationId,
      organizationName: key.organization.name,
      selectedOrganizationId: key.organizationId,
      selectedOrganizationName: key.organization.name,
    };
  }
}
