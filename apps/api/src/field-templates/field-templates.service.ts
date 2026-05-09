import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FieldTemplatesService {
  constructor(private prisma: PrismaService) {}

  // Get user's personal template, or fall back to system default
  async getCurrentForUser(userId: string) {
    const personal = await this.prisma.fieldTemplate.findFirst({
      where: { userId, isSystem: false },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });
    if (personal) return { ...personal, source: 'personal' };

    const systemDefault = await this.prisma.fieldTemplate.findFirst({
      where: { isSystem: true, isDefault: true },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!systemDefault) throw new NotFoundException('No field template found');
    return { ...systemDefault, source: 'system' };
  }

  // Save or replace user's personal template
  async saveForUser(userId: string, data: { name: string; items: { fieldName: string; fieldDescription: string; sortOrder: number }[] }) {
    const existing = await this.prisma.fieldTemplate.findFirst({ where: { userId, isSystem: false } });
    if (existing) {
      await this.prisma.fieldTemplate.delete({ where: { id: existing.id } });
    }

    return this.prisma.fieldTemplate.create({
      data: {
        userId,
        name: data.name,
        isDefault: false,
        isSystem: false,
        items: {
          create: data.items.map((item, idx) => ({
            fieldName: item.fieldName,
            fieldDescription: item.fieldDescription,
            sortOrder: item.sortOrder ?? idx,
          })),
        },
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  // Reset: delete user's personal template so system default is used
  async resetForUser(userId: string) {
    const existing = await this.prisma.fieldTemplate.findFirst({ where: { userId, isSystem: false } });
    if (existing) {
      await this.prisma.fieldTemplate.delete({ where: { id: existing.id } });
    }
    return this.getCurrentForUser(userId);
  }

  // Admin: get system default
  async getSystemDefault() {
    const tmpl = await this.prisma.fieldTemplate.findFirst({
      where: { isSystem: true, isDefault: true },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!tmpl) throw new NotFoundException('System default field template not found');
    return tmpl;
  }

  // Admin: update system default
  async updateSystemDefault(data: { name: string; items: { fieldName: string; fieldDescription: string; sortOrder: number }[] }) {
    const existing = await this.prisma.fieldTemplate.findFirst({ where: { isSystem: true, isDefault: true } });
    if (!existing) throw new NotFoundException('System default template not found');

    await this.prisma.fieldTemplateItem.deleteMany({ where: { templateId: existing.id } });
    return this.prisma.fieldTemplate.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        items: {
          create: data.items.map((item, idx) => ({
            fieldName: item.fieldName,
            fieldDescription: item.fieldDescription,
            sortOrder: item.sortOrder ?? idx,
          })),
        },
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
  }
}
