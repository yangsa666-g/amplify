import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, TemplateKind } from '../../generated/prisma/client';

@Injectable()
export class TemplateRequestsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private includeFieldItems = { items: { orderBy: { sortOrder: 'asc' as const } } };

  // ─── User API ────────────────────────────────────────────────────────────────

  async listForUser(userId: string) {
    return this.prisma.templateRequest.findMany({
      where: { userId },
      include: {
        fieldTemplate: { include: this.includeFieldItems },
        promptTemplate: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async submit(userId: string, body: { templateKind: TemplateKind; templateId: string }) {
    const { templateKind, templateId } = body;

    if (templateKind === 'field') {
      const tmpl = await this.prisma.fieldTemplate.findUnique({ where: { id: templateId } });
      if (!tmpl) throw new NotFoundException('Field template not found');
      if (tmpl.isSystem) throw new BadRequestException('Cannot request a system template');
      if (tmpl.userId !== userId) throw new ForbiddenException();

      // Prevent duplicate pending requests
      const existing = await this.prisma.templateRequest.findFirst({
        where: { userId, fieldTemplateId: templateId, status: 'pending' },
      });
      if (existing) throw new BadRequestException('A pending request already exists for this template');

      const request = await this.prisma.templateRequest.create({
        data: { userId, templateKind: 'field', fieldTemplateId: templateId },
        include: { fieldTemplate: { include: this.includeFieldItems }, user: true },
      });

      // Notify all admins
      const admins = await this.prisma.user.findMany({ where: { role: 'admin', status: 'active' } });
      if (admins.length) {
        await this.notifications.createMany(
          admins.map((a) => a.id),
          NotificationType.template_request_submitted,
          'New Template Promotion Request',
          `${request.user.name} requested to promote field template "${tmpl.name}" to system.`,
          request.id,
        );
      }
      return request;
    } else {
      const tmpl = await this.prisma.promptTemplate.findUnique({ where: { id: templateId } });
      if (!tmpl) throw new NotFoundException('Prompt template not found');
      if (tmpl.isSystem) throw new BadRequestException('Cannot request a system template');
      if (tmpl.userId !== userId) throw new ForbiddenException();

      const existing = await this.prisma.templateRequest.findFirst({
        where: { userId, promptTemplateId: templateId, status: 'pending' },
      });
      if (existing) throw new BadRequestException('A pending request already exists for this template');

      const request = await this.prisma.templateRequest.create({
        data: { userId, templateKind: 'prompt', promptTemplateId: templateId },
        include: { promptTemplate: true, user: true },
      });

      const admins = await this.prisma.user.findMany({ where: { role: 'admin', status: 'active' } });
      if (admins.length) {
        await this.notifications.createMany(
          admins.map((a) => a.id),
          NotificationType.template_request_submitted,
          'New Template Promotion Request',
          `${request.user.name} requested to promote prompt template "${tmpl.name}" to system.`,
          request.id,
        );
      }
      return request;
    }
  }

  // ─── Admin API ───────────────────────────────────────────────────────────────

  async listPending() {
    return this.prisma.templateRequest.findMany({
      where: { status: 'pending' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        fieldTemplate: { include: this.includeFieldItems },
        promptTemplate: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approve(adminId: string, requestId: string) {
    const req = await this.prisma.templateRequest.findUnique({
      where: { id: requestId },
      include: {
        user: true,
        fieldTemplate: { include: this.includeFieldItems },
        promptTemplate: true,
      },
    });
    if (!req) throw new NotFoundException('Request not found');
    if (req.status !== 'pending') throw new BadRequestException('Request is no longer pending');

    if (req.templateKind === 'field' && req.fieldTemplate) {
      const src = req.fieldTemplate;
      await this.prisma.fieldTemplate.create({
        data: {
          name: src.name,
          isSystem: true,
          isDefault: false,
          items: {
            create: src.items.map((item) => ({
              fieldName: item.fieldName,
              fieldDescription: item.fieldDescription,
              sortOrder: item.sortOrder,
            })),
          },
        },
      });
    } else if (req.templateKind === 'prompt' && req.promptTemplate) {
      const src = req.promptTemplate;
      await this.prisma.promptTemplate.create({
        data: {
          name: src.name,
          content: src.content,
          templateType: src.templateType,
          isSystem: true,
          isDefault: false,
        },
      });
    }

    const updated = await this.prisma.templateRequest.update({
      where: { id: requestId },
      data: { status: 'approved', reviewedById: adminId },
    });

    const templateName = req.fieldTemplate?.name ?? req.promptTemplate?.name ?? 'template';
    await this.notifications.create(
      req.userId,
      NotificationType.template_request_approved,
      'Your template was approved!',
      `Your template "${templateName}" has been approved and added to the system templates.`,
      requestId,
    );

    return updated;
  }

  async reject(adminId: string, requestId: string, adminNote?: string) {
    const req = await this.prisma.templateRequest.findUnique({
      where: { id: requestId },
      include: { fieldTemplate: true, promptTemplate: true },
    });
    if (!req) throw new NotFoundException('Request not found');
    if (req.status !== 'pending') throw new BadRequestException('Request is no longer pending');

    const updated = await this.prisma.templateRequest.update({
      where: { id: requestId },
      data: { status: 'rejected', reviewedById: adminId, adminNote: adminNote ?? null },
    });

    const templateName = req.fieldTemplate?.name ?? req.promptTemplate?.name ?? 'template';
    const noteText = adminNote ? ` Admin note: "${adminNote}"` : '';
    await this.notifications.create(
      req.userId,
      NotificationType.template_request_rejected,
      'Your template request was declined',
      `Your template "${templateName}" was not approved.${noteText}`,
      requestId,
    );

    return updated;
  }
}
