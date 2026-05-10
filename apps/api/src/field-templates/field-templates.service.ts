import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

  // ─── User API ───────────────────────────────────────────────────────────────

  /** List all system templates + this user's personal templates */
  async listForUser(userId: string) {
    const [system, personal] = await Promise.all([
      this.prisma.fieldTemplate.findMany({
        where: { isSystem: true },
        include: this.includeItems,
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      }),
      this.prisma.fieldTemplate.findMany({
        where: { userId, isSystem: false },
        include: this.includeItems,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);
    return [
      ...system.map((t) => ({ ...t, scope: 'system' as const })),
      ...personal.map((t) => ({ ...t, scope: 'personal' as const })),
    ];
  }

  /** Get a single template by ID; accessible if it's system or owned by user */
  async getById(id: string, userId: string) {
    const tmpl = await this.prisma.fieldTemplate.findUnique({
      where: { id },
      include: this.includeItems,
    });
    if (!tmpl) throw new NotFoundException('Field template not found');
    if (!tmpl.isSystem && tmpl.userId !== userId) throw new ForbiddenException();
    return { ...tmpl, scope: tmpl.isSystem ? 'system' : ('personal' as const) };
  }

  /** Get the system default (used as fallback when no template ID is provided) */
  async getSystemDefault() {
    const tmpl = await this.prisma.fieldTemplate.findFirst({
      where: { isSystem: true, isDefault: true },
      include: this.includeItems,
    });
    if (!tmpl) throw new NotFoundException('No system default field template found');
    return { ...tmpl, scope: 'system' as const };
  }

  /** Create a new personal template for this user */
  async createUserTemplate(userId: string, data: { name: string; items: ItemInput[] }) {
    return this.prisma.fieldTemplate.create({
      data: {
        userId,
        name: data.name,
        isDefault: false,
        isSystem: false,
        items: { create: data.items.map((item, idx) => this.pickItem(item, idx)) },
      },
      include: this.includeItems,
    });
  }

  /** Update an existing personal template (must be owned by this user) */
  async updateUserTemplate(userId: string, id: string, data: { name: string; items: ItemInput[] }) {
    const existing = await this.prisma.fieldTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Field template not found');
    if (existing.isSystem || existing.userId !== userId) throw new ForbiddenException('Cannot edit this template');

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

  /** Delete a personal template owned by this user */
  async deleteUserTemplate(userId: string, id: string) {
    const existing = await this.prisma.fieldTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Field template not found');
    if (existing.isSystem || existing.userId !== userId) throw new ForbiddenException('Cannot delete this template');
    await this.prisma.fieldTemplate.delete({ where: { id } });
    return { deleted: true };
  }

  /** Duplicate a system template into the user's personal templates */
  async duplicateSystemTemplate(userId: string, systemId: string) {
    const system = await this.prisma.fieldTemplate.findUnique({
      where: { id: systemId },
      include: this.includeItems,
    });
    if (!system || !system.isSystem) throw new NotFoundException('System template not found');

    const created = await this.prisma.fieldTemplate.create({
      data: {
        userId,
        name: `${system.name} (copy)`,
        isDefault: false,
        isSystem: false,
        items: {
          create: system.items.map((item, idx) => this.pickItem(item, idx)),
        },
      },
      include: this.includeItems,
    });
    return { ...created, scope: 'personal' as const };
  }

  // ─── Admin API ───────────────────────────────────────────────────────────────

  /** List all system templates */
  async listSystemTemplates() {
    return this.prisma.fieldTemplate.findMany({
      where: { isSystem: true },
      include: this.includeItems,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  /** Create a new system template */
  async createSystemTemplate(data: { name: string; items: ItemInput[] }) {
    return this.prisma.fieldTemplate.create({
      data: {
        name: data.name,
        isSystem: true,
        isDefault: false,
        items: { create: data.items.map((item, idx) => this.pickItem(item, idx)) },
      },
      include: this.includeItems,
    });
  }

  /** Update a system template */
  async updateSystemTemplate(id: string, data: { name: string; items: ItemInput[] }) {
    const existing = await this.prisma.fieldTemplate.findUnique({ where: { id } });
    if (!existing || !existing.isSystem) throw new NotFoundException('System template not found');

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

  /** Delete a system template */
  async deleteSystemTemplate(id: string) {
    const existing = await this.prisma.fieldTemplate.findUnique({ where: { id } });
    if (!existing || !existing.isSystem) throw new NotFoundException('System template not found');
    await this.prisma.fieldTemplate.delete({ where: { id } });
    return { deleted: true };
  }

  /** Set a system template as the default (clears old default first) */
  async setSystemDefault(id: string) {
    const existing = await this.prisma.fieldTemplate.findUnique({ where: { id } });
    if (!existing || !existing.isSystem) throw new NotFoundException('System template not found');

    await this.prisma.fieldTemplate.updateMany({ where: { isSystem: true, isDefault: true }, data: { isDefault: false } });
    return this.prisma.fieldTemplate.update({ where: { id }, data: { isDefault: true }, include: this.includeItems });
  }
}
