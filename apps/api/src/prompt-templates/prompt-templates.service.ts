import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TemplateType } from '../../generated/prisma/client';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { requireOrganizationContext } from '../auth/access-context';

@Injectable()
export class PromptTemplatesService {
  constructor(private prisma: PrismaService) {}

  private validate(content: string) {
    if (!content.trim()) throw new BadRequestException('Prompt content cannot be empty');
  }

  private normalizeType(templateType: string): TemplateType {
    if (!Object.values(TemplateType).includes(templateType as TemplateType)) {
      throw new BadRequestException('Unsupported prompt template type');
    }
    return templateType as TemplateType;
  }

  async listForUser(user: AuthUser, templateType = 'risk_analysis') {
    const type = this.normalizeType(templateType);
    const ctx = requireOrganizationContext(user);
    const templates = await this.prisma.promptTemplate.findMany({
      where: {
        templateType: type,
        OR: [
          { scope: 'platform' },
          { scope: 'organization', organizationId: ctx.organizationId },
          { scope: 'personal', organizationId: ctx.organizationId, userId: user.userId },
        ],
      },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
    return templates.map((template) => this.withCompatScope(template));
  }

  async getById(id: string, user: AuthUser, expectedType?: string) {
    const ctx = requireOrganizationContext(user);
    const tmpl = await this.prisma.promptTemplate.findUnique({ where: { id } });
    if (!tmpl) throw new NotFoundException('Prompt template not found');
    if (
      tmpl.scope !== 'platform' &&
      (tmpl.organizationId !== ctx.organizationId ||
        (tmpl.scope === 'personal' && tmpl.userId !== user.userId))
    ) {
      throw new ForbiddenException();
    }
    if (expectedType && tmpl.templateType !== this.normalizeType(expectedType)) {
      throw new BadRequestException('Prompt template type does not match this operation');
    }
    return this.withCompatScope(tmpl);
  }

  async getSystemDefault(templateType = 'risk_analysis', organizationId?: string | null) {
    const type = this.normalizeType(templateType);
    const tmpl =
      (organizationId
        ? await this.prisma.promptTemplate.findFirst({
            where: { scope: 'organization', organizationId, templateType: type, isDefault: true },
          })
        : null) ??
      (await this.prisma.promptTemplate.findFirst({
        where: { scope: 'platform', templateType: type, isDefault: true },
      }));
    if (!tmpl) throw new NotFoundException('No default prompt template found');
    return this.withCompatScope(tmpl);
  }

  async createUserTemplate(
    user: AuthUser,
    data: { name: string; content: string },
    templateType = 'risk_analysis',
  ) {
    const type = this.normalizeType(templateType);
    const ctx = requireOrganizationContext(user);
    this.validate(data.content);
    return this.prisma.promptTemplate.create({
      data: {
        userId: user.userId,
        organizationId: ctx.organizationId,
        name: data.name,
        content: data.content,
        templateType: type,
        isDefault: false,
        isSystem: false,
        scope: 'personal',
      },
    });
  }

  async updateUserTemplate(user: AuthUser, id: string, data: { name: string; content: string }) {
    const existing = await this.prisma.promptTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Prompt template not found');
    if (existing.scope !== 'personal' || existing.userId !== user.userId) {
      throw new ForbiddenException('Cannot edit this template');
    }
    this.validate(data.content);
    return this.prisma.promptTemplate.update({
      where: { id },
      data: { name: data.name, content: data.content },
    });
  }

  async deleteUserTemplate(user: AuthUser, id: string) {
    const existing = await this.prisma.promptTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Prompt template not found');
    if (existing.scope !== 'personal' || existing.userId !== user.userId) {
      throw new ForbiddenException('Cannot delete this template');
    }
    await this.prisma.promptTemplate.delete({ where: { id } });
    return { deleted: true };
  }

  async duplicateSystemTemplate(user: AuthUser, systemId: string) {
    const source = await this.getById(systemId, user);
    if (source.scope === 'personal')
      throw new NotFoundException('System prompt template not found');
    const ctx = requireOrganizationContext(user);
    const created = await this.prisma.promptTemplate.create({
      data: {
        userId: user.userId,
        organizationId: ctx.organizationId,
        name: `${source.name} (copy)`,
        content: source.content,
        templateType: source.templateType,
        isDefault: false,
        isSystem: false,
        scope: 'personal',
      },
    });
    return this.withCompatScope(created);
  }

  async listSystemTemplates(user: AuthUser, templateType = 'risk_analysis') {
    const type = this.normalizeType(templateType);
    return this.prisma.promptTemplate.findMany({
      where: { ...this.adminTemplateWhere(user), templateType: type },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async createSystemTemplate(
    user: AuthUser,
    data: { name: string; content: string },
    templateType = 'risk_analysis',
  ) {
    const type = this.normalizeType(templateType);
    const target = this.adminTemplateTarget(user);
    this.validate(data.content);
    return this.prisma.promptTemplate.create({
      data: {
        name: data.name,
        content: data.content,
        templateType: type,
        organizationId: target.organizationId,
        isSystem: target.scope === 'platform',
        isDefault: false,
        scope: target.scope,
      },
    });
  }

  async updateSystemTemplate(user: AuthUser, id: string, data: { name: string; content: string }) {
    await this.assertCanManageAdminTemplate(user, id);
    this.validate(data.content);
    return this.prisma.promptTemplate.update({
      where: { id },
      data: { name: data.name, content: data.content },
    });
  }

  async deleteSystemTemplate(user: AuthUser, id: string) {
    await this.assertCanManageAdminTemplate(user, id);
    await this.prisma.promptTemplate.delete({ where: { id } });
    return { deleted: true };
  }

  async setSystemDefault(user: AuthUser, id: string, templateType = 'risk_analysis') {
    const existing = await this.assertCanManageAdminTemplate(user, id);
    const type = this.normalizeType(templateType);
    if (existing.templateType !== type) {
      throw new BadRequestException('Prompt template type does not match this operation');
    }
    await this.prisma.promptTemplate.updateMany({
      where:
        existing.scope === 'platform'
          ? { scope: 'platform', templateType: type, isDefault: true }
          : {
              scope: 'organization',
              organizationId: existing.organizationId,
              templateType: type,
              isDefault: true,
            },
      data: { isDefault: false },
    });
    return this.prisma.promptTemplate.update({ where: { id }, data: { isDefault: true } });
  }

  private adminTemplateTarget(user: AuthUser) {
    if (user.role === 'super_admin' && !user.selectedOrganizationId) {
      return { scope: 'platform' as const, organizationId: null };
    }
    const ctx = requireOrganizationContext(user);
    return { scope: 'organization' as const, organizationId: ctx.organizationId };
  }

  private adminTemplateWhere(user: AuthUser) {
    const target = this.adminTemplateTarget(user);
    return target.scope === 'platform'
      ? { scope: 'platform' as const }
      : { scope: 'organization' as const, organizationId: target.organizationId };
  }

  private async assertCanManageAdminTemplate(user: AuthUser, id: string) {
    const existing = await this.prisma.promptTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Prompt template not found');
    const where = this.adminTemplateWhere(user);
    if (
      existing.scope !== where.scope ||
      ('organizationId' in where && existing.organizationId !== where.organizationId)
    ) {
      throw new ForbiddenException('Cannot manage this template');
    }
    return existing;
  }

  private withCompatScope<T extends { scope: string }>(template: T) {
    const scope =
      template.scope === 'platform' || template.scope === 'organization' ? 'system' : 'personal';
    return { ...template, scope };
  }
}
