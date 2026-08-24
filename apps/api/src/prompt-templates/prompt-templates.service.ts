import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TemplateType } from '../../generated/prisma/client';

@Injectable()
export class PromptTemplatesService {
  constructor(private prisma: PrismaService) {}

  private validate(content: string) {
    if (!content.trim()) {
      throw new BadRequestException('Prompt content cannot be empty');
    }
  }

  private normalizeType(templateType: string): TemplateType {
    if (!Object.values(TemplateType).includes(templateType as TemplateType)) {
      throw new BadRequestException('Unsupported prompt template type');
    }
    return templateType as TemplateType;
  }

  // ─── User API ─────────────────────────────────────────────────────────────

  /** List all system templates + user's personal templates */
  async listForUser(userId: string, templateType = 'risk_analysis') {
    const type = this.normalizeType(templateType);
    const [system, personal] = await Promise.all([
      this.prisma.promptTemplate.findMany({
        where: { isSystem: true, templateType: type },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      }),
      this.prisma.promptTemplate.findMany({
        where: { userId, isSystem: false, templateType: type },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);
    return [
      ...system.map((t) => ({ ...t, scope: 'system' as const })),
      ...personal.map((t) => ({ ...t, scope: 'personal' as const })),
    ];
  }

  /** Get a single template by ID; accessible if it's system or owned by user */
  async getById(id: string, userId: string, expectedType?: string) {
    const tmpl = await this.prisma.promptTemplate.findUnique({ where: { id } });
    if (!tmpl) throw new NotFoundException('Prompt template not found');
    if (!tmpl.isSystem && tmpl.userId !== userId) throw new ForbiddenException();
    if (expectedType && tmpl.templateType !== this.normalizeType(expectedType)) {
      throw new BadRequestException('Prompt template type does not match this operation');
    }
    return { ...tmpl, scope: tmpl.isSystem ? 'system' : ('personal' as const) };
  }

  /** Get the system default (used as fallback when no template ID is provided) */
  async getSystemDefault(templateType = 'risk_analysis') {
    const type = this.normalizeType(templateType);
    const tmpl = await this.prisma.promptTemplate.findFirst({
      where: { isSystem: true, isDefault: true, templateType: type },
    });
    if (!tmpl) throw new NotFoundException('No system default prompt template found');
    return { ...tmpl, scope: 'system' as const };
  }

  /** Create a new personal template */
  async createUserTemplate(
    userId: string,
    data: { name: string; content: string },
    templateType = 'risk_analysis',
  ) {
    const type = this.normalizeType(templateType);
    this.validate(data.content);
    return this.prisma.promptTemplate.create({
      data: {
        userId,
        name: data.name,
        content: data.content,
        templateType: type,
        isDefault: false,
        isSystem: false,
      },
    });
  }

  /** Update a personal template (must be owned by this user) */
  async updateUserTemplate(userId: string, id: string, data: { name: string; content: string }) {
    const existing = await this.prisma.promptTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Prompt template not found');
    if (existing.isSystem || existing.userId !== userId)
      throw new ForbiddenException('Cannot edit this template');
    this.validate(data.content);
    return this.prisma.promptTemplate.update({
      where: { id },
      data: { name: data.name, content: data.content },
    });
  }

  /** Delete a personal template owned by this user */
  async deleteUserTemplate(userId: string, id: string) {
    const existing = await this.prisma.promptTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Prompt template not found');
    if (existing.isSystem || existing.userId !== userId)
      throw new ForbiddenException('Cannot delete this template');
    await this.prisma.promptTemplate.delete({ where: { id } });
    return { deleted: true };
  }

  /** Duplicate a system template into the user's personal templates */
  async duplicateSystemTemplate(userId: string, systemId: string) {
    const system = await this.prisma.promptTemplate.findUnique({ where: { id: systemId } });
    if (!system || !system.isSystem)
      throw new NotFoundException('System prompt template not found');
    const created = await this.prisma.promptTemplate.create({
      data: {
        userId,
        name: `${system.name} (copy)`,
        content: system.content,
        templateType: system.templateType,
        isDefault: false,
        isSystem: false,
      },
    });
    return { ...created, scope: 'personal' as const };
  }

  // ─── Admin API ─────────────────────────────────────────────────────────────

  /** List all system templates */
  async listSystemTemplates(templateType = 'risk_analysis') {
    const type = this.normalizeType(templateType);
    return this.prisma.promptTemplate.findMany({
      where: { isSystem: true, templateType: type },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  /** Create a new system template */
  async createSystemTemplate(
    data: { name: string; content: string },
    templateType = 'risk_analysis',
  ) {
    const type = this.normalizeType(templateType);
    this.validate(data.content);
    return this.prisma.promptTemplate.create({
      data: {
        name: data.name,
        content: data.content,
        templateType: type,
        isSystem: true,
        isDefault: false,
      },
    });
  }

  /** Update a system template */
  async updateSystemTemplate(id: string, data: { name: string; content: string }) {
    const existing = await this.prisma.promptTemplate.findUnique({ where: { id } });
    if (!existing || !existing.isSystem) throw new NotFoundException('System template not found');
    this.validate(data.content);
    return this.prisma.promptTemplate.update({
      where: { id },
      data: { name: data.name, content: data.content },
    });
  }

  /** Delete a system template */
  async deleteSystemTemplate(id: string) {
    const existing = await this.prisma.promptTemplate.findUnique({ where: { id } });
    if (!existing || !existing.isSystem) throw new NotFoundException('System template not found');
    await this.prisma.promptTemplate.delete({ where: { id } });
    return { deleted: true };
  }

  /** Set a system template as the default (clears old default first) */
  async setSystemDefault(id: string, templateType = 'risk_analysis') {
    const existing = await this.prisma.promptTemplate.findUnique({ where: { id } });
    if (!existing || !existing.isSystem) throw new NotFoundException('System template not found');
    const type = this.normalizeType(templateType);
    if (existing.templateType !== type) {
      throw new BadRequestException('Prompt template type does not match this operation');
    }
    await this.prisma.promptTemplate.updateMany({
      where: { isSystem: true, isDefault: true, templateType: type },
      data: { isDefault: false },
    });
    return this.prisma.promptTemplate.update({ where: { id }, data: { isDefault: true } });
  }
}
