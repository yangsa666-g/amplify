import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HistoryService {
  constructor(private prisma: PrismaService) {}

  /** Current user's own recent history (used by the "My History" page). */
  async getRecent(userId: string) {
    const [analysisJobs, compareJobs] = await Promise.all([
      this.prisma.analysisJob.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          document: { select: { fileName: true } },
          fieldTemplate: { select: { id: true, name: true } },
          feedbacks: {
            where: { userId },
            select: { userId: true, rating: true, comment: true },
          },
        },
      }),
      this.prisma.compareJob.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          oldDocument: { select: { fileName: true } },
          newDocument: { select: { fileName: true } },
        },
      }),
    ]);
    return { analysisJobs, compareJobs };
  }

  /** Every user's history (admin-only, used by the "All History" page). */
  async getAllForAdmin() {
    const [analysisJobs, compareJobs] = await Promise.all([
      this.prisma.analysisJob.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          document: { select: { fileName: true } },
          fieldTemplate: { select: { id: true, name: true } },
          feedbacks: { select: { userId: true, rating: true, comment: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.compareJob.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          oldDocument: { select: { fileName: true } },
          newDocument: { select: { fileName: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);
    return { analysisJobs, compareJobs };
  }
}
