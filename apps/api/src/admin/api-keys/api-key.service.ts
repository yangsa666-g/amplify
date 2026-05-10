import { Injectable, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

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
    const map: Record<ExpiryOption, () => Date | null> = {
      '1m': () => new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()),
      '3m': () => new Date(now.getFullYear(), now.getMonth() + 3, now.getDate()),
      '6m': () => new Date(now.getFullYear(), now.getMonth() + 6, now.getDate()),
      '1y': () => new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
      'never': () => null,
    };
    return map[option]();
  }

  async getCurrent() {
    const key = await this.prisma.apiKey.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!key) return null;
    return {
      id: key.id,
      keyPrefix: key.keyPrefix,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
      createdBy: key.createdBy,
    };
  }

  async create(userId: string, expiry: ExpiryOption = '1m') {
    const existing = await this.prisma.apiKey.findFirst();
    if (existing) {
      throw new ConflictException('An API key already exists. Delete it before creating a new one.');
    }

    const rawKey = `amp_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = this.hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, 12);
    const expiresAt = this.computeExpiry(expiry);

    await this.prisma.apiKey.create({
      data: { keyHash, keyPrefix, expiresAt, createdBy: userId },
    });

    return { rawKey, keyPrefix, expiresAt };
  }

  async delete(id: string) {
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key) throw new NotFoundException('API key not found');
    await this.prisma.apiKey.delete({ where: { id } });
  }

  async validateKey(rawKey: string): Promise<{ userId: string; role: string; email: string } | null> {
    if (!rawKey?.startsWith('amp_')) return null;
    const hash = this.hashKey(rawKey);
    const key = await this.prisma.apiKey.findUnique({
      where: { keyHash: hash },
      include: { creator: { select: { id: true, email: true, role: true } } },
    });
    if (!key) return null;
    if (key.expiresAt && key.expiresAt < new Date()) return null;
    return { userId: key.creator.id, email: key.creator.email, role: key.creator.role };
  }
}
