import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { businessWhere, ownBusinessWhere } from '../auth/access-context';

@Injectable()
export class HistoryService {
  constructor(private prisma: PrismaService) {}

  /** Current user's own recent history (used by the "My History" page). */
  async getRecent(user: AuthUser) {
    const [analysisJobs, compareJobs] = await Promise.all([
      this.prisma.analysisJob.findMany({
        where: ownBusinessWhere(user),
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          document: { select: { fileName: true } },
          fieldTemplate: { select: { id: true, name: true } },
          promptTemplate: { select: { id: true, name: true } },
          feedbacks: {
            where: { userId: user.userId },
            select: { userId: true, rating: true, comment: true },
          },
        },
      }),
      this.prisma.compareJob.findMany({
        where: ownBusinessWhere(user),
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          documents: {
            orderBy: { sortOrder: 'asc' },
            include: { document: { select: { id: true, fileName: true } } },
          },
          promptTemplate: { select: { id: true, name: true } },
          feedbacks: {
            where: { userId: user.userId },
            select: { userId: true, rating: true, comment: true },
          },
        },
      }),
    ]);
    return { analysisJobs, compareJobs };
  }

  /** Every user's history (admin-only, used by the "All History" page). */
  async getAllForAdmin(user: AuthUser) {
    const [analysisJobs, compareJobs] = await Promise.all([
      this.prisma.analysisJob.findMany({
        where: businessWhere(user),
        orderBy: { createdAt: 'desc' },
        include: {
          document: { select: { fileName: true } },
          fieldTemplate: { select: { id: true, name: true } },
          promptTemplate: { select: { id: true, name: true } },
          feedbacks: { select: { userId: true, rating: true, comment: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.compareJob.findMany({
        where: businessWhere(user),
        orderBy: { createdAt: 'desc' },
        include: {
          documents: {
            orderBy: { sortOrder: 'asc' },
            include: { document: { select: { id: true, fileName: true } } },
          },
          promptTemplate: { select: { id: true, name: true } },
          feedbacks: { select: { userId: true, rating: true, comment: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);
    return { analysisJobs, compareJobs };
  }
}
