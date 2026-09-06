import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '../../generated/prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async getForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({ where: { userId, isRead: false } });
    return { count };
  }

  async markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    requestId?: string,
    organizationId?: string,
  ) {
    return this.prisma.notification.create({
      data: { userId, type, title, body, requestId, organizationId },
    });
  }

  async createMany(
    userIds: string[],
    type: NotificationType,
    title: string,
    body: string,
    requestId?: string,
    organizationId?: string,
  ) {
    return this.prisma.notification.createMany({
      data: userIds.map((userId) => ({ userId, type, title, body, requestId, organizationId })),
    });
  }
}
