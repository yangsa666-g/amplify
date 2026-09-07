import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, TemplateKind } from '../../generated/prisma/client';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { requireOrganizationContext } from '../auth/access-context';

@Injectable()
export class TemplateRequestsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private includeFieldItems = { items: { orderBy: { sortOrder: 'asc' as const } } };

  // ─── User API ────────────────────────────────────────────────────────────────

  async listForUser(user: AuthUser) {
    return this.prisma.templateRequest.findMany({
      where: { userId: user.userId },
      include: {
        fieldTemplate: { include: this.includeFieldItems },
        promptTemplate: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async submit(user: AuthUser, body: { templateKind: TemplateKind; templateId: string }) {
    const { templateKind, templateId } = body;
    const ctx = requireOrganizationContext(user);

    if (templateKind === 'field') {
      const tmpl = await this.prisma.fieldTemplate.findUnique({ where: { id: templateId } });
      if (!tmpl) throw new NotFoundException('Field template not found');
      if (tmpl.scope !== 'personal')
        throw new BadRequestException('Cannot request a system template');
      if (tmpl.userId !== user.userId || tmpl.organizationId !== ctx.organizationId)
        throw new ForbiddenException();

      // Prevent duplicate pending requests
      const existing = await this.prisma.templateRequest.findFirst({
        where: { userId: user.userId, fieldTemplateId: templateId, status: 'pending' },
      });
      if (existing)
        throw new BadRequestException('A pending request already exists for this template');

      const request = await this.prisma.templateRequest.create({
        data: {
          userId: user.userId,
          organizationId: ctx.organizationId,
          templateKind: 'field',
          fieldTemplateId: templateId,
        },
        include: { fieldTemplate: { include: this.includeFieldItems }, user: true },
      });

      // Notify only active Admins in the requester's organization.
      const admins = await this.prisma.user.findMany({
        where: { role: 'admin', status: 'active', organizationId: ctx.organizationId },
      });
      if (admins.length) {
        await this.notifications.createMany(
          admins.map((a) => a.id),
          NotificationType.template_request_submitted,
          'New Template Promotion Request',
          `${request.user.name} requested to promote field template "${tmpl.name}" to organization templates.`,
          request.id,
          ctx.organizationId,
        );
      }
      return request;
    } else {
      const tmpl = await this.prisma.promptTemplate.findUnique({ where: { id: templateId } });
      if (!tmpl) throw new NotFoundException('Prompt template not found');
      if (tmpl.scope !== 'personal')
        throw new BadRequestException('Cannot request a system template');
      if (tmpl.userId !== user.userId || tmpl.organizationId !== ctx.organizationId)
        throw new ForbiddenException();

      const existing = await this.prisma.templateRequest.findFirst({
        where: { userId: user.userId, promptTemplateId: templateId, status: 'pending' },
      });
      if (existing)
        throw new BadRequestException('A pending request already exists for this template');

      const request = await this.prisma.templateRequest.create({
        data: {
          userId: user.userId,
          organizationId: ctx.organizationId,
          templateKind: 'prompt',
          promptTemplateId: templateId,
        },
        include: { promptTemplate: true, user: true },
      });

      const admins = await this.prisma.user.findMany({
        where: { role: 'admin', status: 'active', organizationId: ctx.organizationId },
      });
      if (admins.length) {
        await this.notifications.createMany(
          admins.map((a) => a.id),
          NotificationType.template_request_submitted,
          'New Template Promotion Request',
          `${request.user.name} requested to promote prompt template "${tmpl.name}" to organization templates.`,
          request.id,
          ctx.organizationId,
        );
      }
      return request;
    }
  }

  // ─── Admin API ───────────────────────────────────────────────────────────────

  async listPending(user: AuthUser) {
    const ctx = requireOrganizationContext(user);
    return this.prisma.templateRequest.findMany({
      where: { status: 'pending', organizationId: ctx.organizationId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        fieldTemplate: { include: this.includeFieldItems },
        promptTemplate: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approve(admin: AuthUser, requestId: string) {
    const ctx = requireOrganizationContext(admin);
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
    if (req.organizationId !== ctx.organizationId) throw new ForbiddenException();

    if (req.templateKind === 'field' && req.fieldTemplate) {
      const src = req.fieldTemplate;
      await this.prisma.fieldTemplate.create({
        data: {
          name: src.name,
          organizationId: req.organizationId,
          isSystem: false,
          scope: 'organization',
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
          organizationId: req.organizationId,
          isSystem: false,
          scope: 'organization',
          isDefault: false,
        },
      });
    }

    const updated = await this.prisma.templateRequest.update({
      where: { id: requestId },
      data: { status: 'approved', reviewedById: admin.userId },
    });

    const templateName = req.fieldTemplate?.name ?? req.promptTemplate?.name ?? 'template';
    await this.notifications.create(
      req.userId,
      NotificationType.template_request_approved,
      'Your template was approved!',
      `Your template "${templateName}" has been approved and added to the system templates.`,
      requestId,
      req.organizationId,
    );

    return updated;
  }

  async reject(admin: AuthUser, requestId: string, adminNote?: string) {
    const ctx = requireOrganizationContext(admin);
    const req = await this.prisma.templateRequest.findUnique({
      where: { id: requestId },
      include: { fieldTemplate: true, promptTemplate: true },
    });
    if (!req) throw new NotFoundException('Request not found');
    if (req.status !== 'pending') throw new BadRequestException('Request is no longer pending');
    if (req.organizationId !== ctx.organizationId) throw new ForbiddenException();

    const updated = await this.prisma.templateRequest.update({
      where: { id: requestId },
      data: { status: 'rejected', reviewedById: admin.userId, adminNote: adminNote ?? null },
    });

    const templateName = req.fieldTemplate?.name ?? req.promptTemplate?.name ?? 'template';
    const noteText = adminNote ? ` Admin note: "${adminNote}"` : '';
    await this.notifications.create(
      req.userId,
      NotificationType.template_request_rejected,
      'Your template request was declined',
      `Your template "${templateName}" was not approved.${noteText}`,
      requestId,
      req.organizationId,
    );

    return updated;
  }
}
