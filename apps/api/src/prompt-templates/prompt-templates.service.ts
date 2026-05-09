import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PromptTemplatesService {
  constructor(private prisma: PrismaService) {}

  private validate(content: string) {
    if (!content.includes('{contract_text}')) {
      throw new BadRequestException('Prompt must contain the placeholder {contract_text}');
    }
  }

  async getCurrentForUser(userId: string, templateType = 'risk_analysis') {
    const personal = await this.prisma.promptTemplate.findFirst({
      where: { userId, templateType: templateType as any, isSystem: false },
      orderBy: { updatedAt: 'desc' },
    });
    if (personal) return { ...personal, source: 'personal' };

    const systemDefault = await this.prisma.promptTemplate.findFirst({
      where: { isSystem: true, isDefault: true, templateType: templateType as any },
    });
    if (!systemDefault) throw new NotFoundException('No prompt template found');
    return { ...systemDefault, source: 'system' };
  }

  async saveForUser(userId: string, data: { name: string; content: string }, templateType = 'risk_analysis') {
    this.validate(data.content);
    const existing = await this.prisma.promptTemplate.findFirst({
      where: { userId, templateType: templateType as any, isSystem: false },
    });
    if (existing) {
      return this.prisma.promptTemplate.update({
        where: { id: existing.id },
        data: { name: data.name, content: data.content },
      });
    }
    return this.prisma.promptTemplate.create({
      data: { userId, name: data.name, content: data.content, templateType: templateType as any, isDefault: false, isSystem: false },
    });
  }

  async resetForUser(userId: string, templateType = 'risk_analysis') {
    const existing = await this.prisma.promptTemplate.findFirst({
      where: { userId, templateType: templateType as any, isSystem: false },
    });
    if (existing) {
      await this.prisma.promptTemplate.delete({ where: { id: existing.id } });
    }
    return this.getCurrentForUser(userId, templateType);
  }

  async getSystemDefault(templateType = 'risk_analysis') {
    const tmpl = await this.prisma.promptTemplate.findFirst({
      where: { isSystem: true, isDefault: true, templateType: templateType as any },
    });
    if (!tmpl) throw new NotFoundException('System default prompt not found');
    return tmpl;
  }

  async updateSystemDefault(data: { name: string; content: string }, templateType = 'risk_analysis') {
    this.validate(data.content);
    const existing = await this.prisma.promptTemplate.findFirst({
      where: { isSystem: true, isDefault: true, templateType: templateType as any },
    });
    if (!existing) throw new NotFoundException('System default prompt not found');
    return this.prisma.promptTemplate.update({
      where: { id: existing.id },
      data: { name: data.name, content: data.content },
    });
  }
}
