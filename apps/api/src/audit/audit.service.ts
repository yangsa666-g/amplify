import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditQueryDto } from './dto/audit-query.dto';

interface AuditRecordInput {
  userId?: string;
  action: string;
  method: string;
  path: string;
  targetType?: string;
  targetId?: string;
  statusCode: number;
  durationMs?: number;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Prisma.InputJsonObject;
}

@Injectable()
export class AuditService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditService.name);
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    void this.cleanupExpired('startup').catch((error) => this.logCleanupFailure('startup', error));
    this.cleanupTimer = setInterval(
      () =>
        void this.cleanupExpired('scheduled').catch((error) =>
          this.logCleanupFailure('scheduled', error),
        ),
      24 * 60 * 60 * 1000,
    );
    this.cleanupTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  async record(input: AuditRecordInput) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: input.userId,
          action: input.action,
          method: input.method,
          path: input.path,
          targetType: input.targetType,
          targetId: input.targetId,
          statusCode: input.statusCode,
          durationMs: input.durationMs,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          metadata: input.metadata,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to write audit log: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  async find(query: AuditQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildWhere(query);

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: query.sortOrder ?? 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async getActions() {
    const groups = await this.prisma.auditLog.groupBy({
      by: ['action'],
      _count: { _all: true },
      orderBy: { _count: { action: 'desc' } },
      take: 100,
    });
    return groups.map((g) => ({ action: g.action, count: g._count._all }));
  }

  getRetention() {
    const retentionDays = this.retentionDays();
    return {
      retentionDays,
      cutoff: this.cutoffDate(retentionDays),
    };
  }

  async cleanupExpired(reason: 'manual' | 'scheduled' | 'startup' = 'manual') {
    const retentionDays = this.retentionDays();
    const cutoff = this.cutoffDate(retentionDays);
    const result = await this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    if (result.count > 0 || reason === 'manual') {
      this.logger.log(
        `Audit log cleanup (${reason}) deleted ${result.count} row(s) older than ${retentionDays} day(s).`,
      );
    }

    return {
      deletedCount: result.count,
      retentionDays,
      cutoff,
    };
  }

  private buildWhere(query: AuditQueryDto) {
    const and: Prisma.AuditLogWhereInput[] = [];

    if (query.userId) and.push({ userId: query.userId });
    if (query.action) and.push({ action: query.action });
    if (query.method) and.push({ method: query.method });
    if (query.statusCode) and.push({ statusCode: query.statusCode });

    if (query.from || query.to) {
      and.push({
        createdAt: {
          ...(query.from ? { gte: new Date(query.from) } : {}),
          ...(query.to ? { lte: new Date(query.to) } : {}),
        },
      });
    }

    const q = query.q?.trim();
    if (q) {
      and.push({
        OR: [
          { action: { contains: q, mode: 'insensitive' } },
          { path: { contains: q, mode: 'insensitive' } },
          { targetType: { contains: q, mode: 'insensitive' } },
          { targetId: { contains: q, mode: 'insensitive' } },
          { userAgent: { contains: q, mode: 'insensitive' } },
          { user: { is: { name: { contains: q, mode: 'insensitive' } } } },
          { user: { is: { email: { contains: q, mode: 'insensitive' } } } },
        ],
      });
    }

    return and.length ? { AND: and } : {};
  }

  private retentionDays() {
    const raw = this.config.get<string>('AUDIT_LOG_RETENTION_DAYS');
    const parsed = Number.parseInt(raw || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 180;
  }

  private cutoffDate(retentionDays: number) {
    return new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  }

  private logCleanupFailure(reason: 'scheduled' | 'startup', error: unknown) {
    this.logger.warn(
      `Audit log cleanup (${reason}) failed: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
    );
  }
}
