import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HistoryService {
  constructor(private prisma: PrismaService) {}

  async getRecent(userId: string, role: string) {
    const isAdmin = role === 'admin';
    const [analysisJobs, compareJobs] = await Promise.all([
      this.prisma.analysisJob.findMany({
        where: isAdmin ? undefined : { userId },
        orderBy: { createdAt: 'desc' },
        take: isAdmin ? undefined : 10,
        include: {
          document: { select: { fileName: true } },
          feedbacks: {
            where: isAdmin ? undefined : { userId },
            select: { userId: true, rating: true, comment: true },
          },
          ...(isAdmin ? { user: { select: { id: true, name: true, email: true } } } : {}),
        },
      }),
      this.prisma.compareJob.findMany({
        where: isAdmin ? undefined : { userId },
        orderBy: { createdAt: 'desc' },
        take: isAdmin ? undefined : 10,
        include: {
          oldDocument: { select: { fileName: true } },
          newDocument: { select: { fileName: true } },
          ...(isAdmin ? { user: { select: { id: true, name: true, email: true } } } : {}),
        },
      }),
    ]);
    return { analysisJobs, compareJobs };
  }
}
