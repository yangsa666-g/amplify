import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { requireOrganizationContext } from '../auth/access-context';

type ItemInput = { fieldName: string; fieldDescription: string; sortOrder: number };

@Injectable()
export class FieldTemplatesService {
  constructor(private prisma: PrismaService) {}

  private includeItems = { items: { orderBy: { sortOrder: 'asc' as const } } };

  private pickItem(item: any, idx: number) {
    return {
      fieldName: item.fieldName,
      fieldDescription: item.fieldDescription,
      sortOrder: item.sortOrder ?? idx,
    };
  }

  async listForUser(user: AuthUser) {
    const ctx = requireOrganizationContext(user);
    const templates = await this.prisma.fieldTemplate.findMany({
      where: {
        OR: [
          { scope: 'platform' },
          { scope: 'organization', organizationId: ctx.organizationId },
          { scope: 'personal', organizationId: ctx.organizationId, userId: user.userId },
        ],
      },
      include: this.includeItems,
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
    return templates.map((template) => this.withCompatScope(template));
  }

  async getById(id: string, user: AuthUser) {
    const ctx = requireOrganizationContext(user);
    const tmpl = await this.prisma.fieldTemplate.findUnique({
      where: { id },
      include: this.includeItems,
    });
    if (!tmpl) throw new NotFoundException('Field template not found');
    if (
      tmpl.scope !== 'platform' &&
      (tmpl.organizationId !== ctx.organizationId ||
        (tmpl.scope === 'personal' && tmpl.userId !== user.userId))
    ) {
      throw new ForbiddenException();
    }
    return this.withCompatScope(tmpl);
  }

  async getSystemDefault(organizationId?: string | null) {
    const tmpl =
      (organizationId
        ? await this.prisma.fieldTemplate.findFirst({
            where: { scope: 'organization', organizationId, isDefault: true },
            include: this.includeItems,
          })
        : null) ??
      (await this.prisma.fieldTemplate.findFirst({
        where: { scope: 'platform', isDefault: true },
        include: this.includeItems,
      }));
    if (!tmpl) throw new NotFoundException('No default field template found');
    return this.withCompatScope(tmpl);
  }

  async createUserTemplate(user: AuthUser, data: { name: string; items: ItemInput[] }) {
    const ctx = requireOrganizationContext(user);
    return this.prisma.fieldTemplate.create({
      data: {
        userId: user.userId,
        organizationId: ctx.organizationId,
        name: data.name,
        isDefault: false,
        isSystem: false,
        scope: 'personal',
        items: { create: data.items.map((item, idx) => this.pickItem(item, idx)) },
      },
      include: this.includeItems,
    });
  }

  async updateUserTemplate(user: AuthUser, id: string, data: { name: string; items: ItemInput[] }) {
    const existing = await this.prisma.fieldTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Field template not found');
    if (existing.scope !== 'personal' || existing.userId !== user.userId) {
      throw new ForbiddenException('Cannot edit this template');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.fieldTemplateItem.deleteMany({ where: { templateId: id } });
      return tx.fieldTemplate.update({
        where: { id },
        data: {
          name: data.name,
          items: { create: data.items.map((item, idx) => this.pickItem(item, idx)) },
        },
        include: this.includeItems,
      });
    });
  }

  async deleteUserTemplate(user: AuthUser, id: string) {
    const existing = await this.prisma.fieldTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Field template not found');
    if (existing.scope !== 'personal' || existing.userId !== user.userId) {
      throw new ForbiddenException('Cannot delete this template');
    }
    await this.prisma.fieldTemplate.delete({ where: { id } });
    return { deleted: true };
  }

  async duplicateSystemTemplate(user: AuthUser, systemId: string) {
    const source = await this.getById(systemId, user);
    if (source.scope === 'personal') throw new NotFoundException('System template not found');
    const ctx = requireOrganizationContext(user);

    const created = await this.prisma.fieldTemplate.create({
      data: {
        userId: user.userId,
        organizationId: ctx.organizationId,
        name: `${source.name} (copy)`,
        isDefault: false,
        isSystem: false,
        scope: 'personal',
        items: { create: source.items.map((item: any, idx: number) => this.pickItem(item, idx)) },
      },
      include: this.includeItems,
    });
    return this.withCompatScope(created);
  }

  async listSystemTemplates(user: AuthUser) {
    const where = this.adminTemplateWhere(user);
    const templates = await this.prisma.fieldTemplate.findMany({
      where:
        where.scope === 'platform'
          ? where
          : {
              OR: [{ scope: 'platform' as const }, where],
            },
      include: this.includeItems,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    return templates.map((template) => this.withCompatScope(template));
  }

  async createSystemTemplate(user: AuthUser, data: { name: string; items: ItemInput[] }) {
    const target = this.adminTemplateTarget(user);
    return this.prisma.fieldTemplate.create({
      data: {
        name: data.name,
        organizationId: target.organizationId,
        isSystem: target.scope === 'platform',
        scope: target.scope,
        isDefault: false,
        items: { create: data.items.map((item, idx) => this.pickItem(item, idx)) },
      },
      include: this.includeItems,
    });
  }

  async updateSystemTemplate(
    user: AuthUser,
    id: string,
    data: { name: string; items: ItemInput[] },
  ) {
    await this.assertCanManageAdminTemplate(user, id);
    return this.prisma.$transaction(async (tx) => {
      await tx.fieldTemplateItem.deleteMany({ where: { templateId: id } });
      return tx.fieldTemplate.update({
        where: { id },
        data: {
          name: data.name,
          items: { create: data.items.map((item, idx) => this.pickItem(item, idx)) },
        },
        include: this.includeItems,
      });
    });
  }

  async deleteSystemTemplate(user: AuthUser, id: string) {
    await this.assertCanManageAdminTemplate(user, id);
    await this.prisma.fieldTemplate.delete({ where: { id } });
    return { deleted: true };
  }

  async setSystemDefault(user: AuthUser, id: string) {
    const existing = await this.assertCanManageAdminTemplate(user, id);
    await this.prisma.fieldTemplate.updateMany({
      where:
        existing.scope === 'platform'
          ? { scope: 'platform', isDefault: true }
          : { scope: 'organization', organizationId: existing.organizationId, isDefault: true },
      data: { isDefault: false },
    });
    return this.prisma.fieldTemplate.update({
      where: { id },
      data: { isDefault: true },
      include: this.includeItems,
    });
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
    const existing = await this.prisma.fieldTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Field template not found');
    const where = this.adminTemplateWhere(user);
    if (
      existing.scope !== where.scope ||
      ('organizationId' in where && existing.organizationId !== where.organizationId)
    ) {
      throw new ForbiddenException('Cannot manage this template');
    }
    return existing;
  }

  private withCompatScope<T extends { scope: string; isSystem: boolean }>(template: T) {
    const scope =
      template.scope === 'platform' || template.scope === 'organization' ? 'system' : 'personal';
    return { ...template, templateScope: template.scope, scope };
  }
}
