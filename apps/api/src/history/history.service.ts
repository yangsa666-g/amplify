import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HistoryService {
  constructor(private prisma: PrismaService) {}

  async getRecent(userId: string) {
    const [analysisJobs, compareJobs] = await Promise.all([
      this.prisma.analysisJob.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { document: { select: { fileName: true } } },
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
}
