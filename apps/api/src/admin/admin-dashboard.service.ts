import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Period = '24h' | '7d' | '30d';

@Injectable()
export class AdminDashboardService {
  constructor(private prisma: PrismaService) {}

  private getSince(period: Period): Date {
    const now = new Date();
    if (period === '24h') return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    if (period === '7d') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  async getStats(period: Period) {
    const since = this.getSince(period);

    const [
      analysisJobs,
      compareJobs,
      analysisFeedbacks,
      compareFeedbacks,
      newUsers,
      activeAnalysisUserIds,
      activeCompareUserIds,
      analysisModelGroups,
      compareModelGroups,
    ] = await Promise.all([
      this.prisma.analysisJob.findMany({
        where: { createdAt: { gte: since } },
        select: { id: true, status: true, userId: true, modelName: true, createdAt: true },
      }),
      this.prisma.compareJob.findMany({
        where: { createdAt: { gte: since } },
        select: { id: true, status: true, userId: true, createdAt: true },
      }),
      this.prisma.analysisJobFeedback.findMany({
        where: { createdAt: { gte: since } },
        select: { rating: true, analysisJobId: true },
      }),
      this.prisma.compareJobFeedback.findMany({
        where: { createdAt: { gte: since } },
        select: { rating: true, compareJobId: true },
      }),
      this.prisma.user.count({ where: { createdAt: { gte: since } } }),
      this.prisma.analysisJob.findMany({
        where: { createdAt: { gte: since } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.compareJob.findMany({
        where: { createdAt: { gte: since } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.analysisJob.groupBy({
        by: ['modelName'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { _count: { modelName: 'desc' } },
      }),
      this.prisma.compareJob.groupBy({
        by: ['modelName'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { _count: { modelName: 'desc' } },
      }),
    ]);

    // Analysis status breakdown
    const analysisStatusCounts = { pending: 0, running: 0, success: 0, failed: 0 };
    for (const job of analysisJobs) {
      analysisStatusCounts[job.status as keyof typeof analysisStatusCounts]++;
    }
    const analysisTotalCount = analysisJobs.length;
    const analysisSuccessRate =
      analysisTotalCount > 0
        ? Math.round((analysisStatusCounts.success / analysisTotalCount) * 100)
        : 0;

    // Compare status breakdown
    const compareStatusCounts = { pending: 0, running: 0, success: 0, failed: 0 };
    for (const job of compareJobs) {
      compareStatusCounts[job.status as keyof typeof compareStatusCounts]++;
    }
    const compareTotalCount = compareJobs.length;
    const compareSuccessRate =
      compareTotalCount > 0
        ? Math.round((compareStatusCounts.success / compareTotalCount) * 100)
        : 0;

    // Feedback breakdown
    const feedbacks = [...analysisFeedbacks, ...compareFeedbacks];
    const thumbsUp = feedbacks.filter((f) => f.rating === 1).length;
    const thumbsDown = feedbacks.filter((f) => f.rating === -1).length;
    const totalFeedback = feedbacks.length;
    const feedbackPositiveRate =
      totalFeedback > 0 ? Math.round((thumbsUp / totalFeedback) * 100) : null;

    // Active users (union of unique userIds)
    const activeUserIdSet = new Set([
      ...activeAnalysisUserIds.map((u) => u.userId),
      ...activeCompareUserIds.map((u) => u.userId),
    ]);
    const activeUsersCount = activeUserIdSet.size;

    // Model usage
    const modelUsageMap = new Map<string, number>();
    for (const group of [...analysisModelGroups, ...compareModelGroups]) {
      modelUsageMap.set(
        group.modelName,
        (modelUsageMap.get(group.modelName) ?? 0) + group._count._all,
      );
    }
    const modelUsage = [...modelUsageMap.entries()]
      .map(([modelName, count]) => ({ modelName, count }))
      .sort((a, b) => b.count - a.count);

    // Daily volume: group jobs by date
    const dailyVolume = this.buildDailyVolume(analysisJobs, compareJobs, since, period);

    // Top 5 most active users
    const topUsers = await this.getTopUsers(since);

    return {
      period,
      analysis: {
        total: analysisTotalCount,
        successRate: analysisSuccessRate,
        statusBreakdown: analysisStatusCounts,
      },
      compare: {
        total: compareTotalCount,
        successRate: compareSuccessRate,
        statusBreakdown: compareStatusCounts,
      },
      feedback: {
        total: totalFeedback,
        thumbsUp,
        thumbsDown,
        positiveRate: feedbackPositiveRate,
      },
      users: {
        activeCount: activeUsersCount,
        newCount: newUsers,
        topUsers,
      },
      modelUsage,
      dailyVolume,
    };
  }

  private buildDailyVolume(
    analysisJobs: { createdAt: Date }[],
    compareJobs: { createdAt: Date }[],
    since: Date,
    period: Period,
  ) {
    const days = period === '24h' ? 1 : period === '7d' ? 7 : 30;
    const result: { date: string; analyses: number; compares: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      result.push({ date: dateStr, analyses: 0, compares: 0 });
    }

    for (const job of analysisJobs) {
      const dateStr = new Date(job.createdAt).toISOString().slice(0, 10);
      const entry = result.find((r) => r.date === dateStr);
      if (entry) entry.analyses++;
    }
    for (const job of compareJobs) {
      const dateStr = new Date(job.createdAt).toISOString().slice(0, 10);
      const entry = result.find((r) => r.date === dateStr);
      if (entry) entry.compares++;
    }

    return result;
  }

  private async getTopUsers(since: Date) {
    const [analysisGroups, compareGroups] = await Promise.all([
      this.prisma.analysisJob.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
      this.prisma.compareJob.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
    ]);

    const activity = new Map<string, { analysisCount: number; compareCount: number }>();
    for (const group of analysisGroups) {
      activity.set(group.userId, { analysisCount: group._count._all, compareCount: 0 });
    }
    for (const group of compareGroups) {
      const current = activity.get(group.userId) ?? { analysisCount: 0, compareCount: 0 };
      current.compareCount = group._count._all;
      activity.set(group.userId, current);
    }
    const userIds = [...activity.entries()]
      .sort(
        (a, b) => b[1].analysisCount + b[1].compareCount - (a[1].analysisCount + a[1].compareCount),
      )
      .slice(0, 5)
      .map(([userId]) => userId);
    if (userIds.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    return userIds.map((userId) => {
      const user = users.find((u) => u.id === userId);
      const counts = activity.get(userId)!;
      return {
        userId,
        name: user?.name ?? 'Unknown',
        email: user?.email ?? '',
        analysisCount: counts.analysisCount,
        compareCount: counts.compareCount,
      };
    });
  }
}
