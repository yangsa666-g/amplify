import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiffService } from './diff.service';
import { DocumentsService } from '../documents/documents.service';

@Injectable()
export class CompareService {
  constructor(
    private prisma: PrismaService,
    private diff: DiffService,
    private documents: DocumentsService,
  ) {}

  async run(userId: string, oldDocumentId: string, newDocumentId: string, diffMode: 'unified' | 'side_by_side' = 'side_by_side') {
    const oldText = await this.documents.getExtractedText(oldDocumentId, userId);
    const newText = await this.documents.getExtractedText(newDocumentId, userId);

    const job = await this.prisma.compareJob.create({
      data: {
        userId,
        oldDocumentId,
        newDocumentId,
        diffMode: diffMode === 'side_by_side' ? 'side_by_side' : 'unified',
        status: 'running',
      },
    });

    try {
      const chunks = this.diff.computeLineDiff(oldText, newText);
      const stats = {
        added: chunks.filter((c) => c.type === 'added').reduce((s, c) => s + c.lines.length, 0),
        removed: chunks.filter((c) => c.type === 'removed').reduce((s, c) => s + c.lines.length, 0),
        unchanged: chunks.filter((c) => c.type === 'unchanged').reduce((s, c) => s + c.lines.length, 0),
      };

      const diffResult = { chunks, stats };

      await this.prisma.compareJob.update({
        where: { id: job.id },
        data: { status: 'success', diffResultJson: diffResult as any },
      });

      return { compareJobId: job.id, status: 'success', diffMode, diffResult };
    } catch (err: any) {
      await this.prisma.compareJob.update({
        where: { id: job.id },
        data: { status: 'failed', errorMessage: err.message },
      });
      throw err;
    }
  }

  async findOne(id: string, userId: string) {
    const job = await this.prisma.compareJob.findFirst({
      where: { id, userId },
      include: {
        oldDocument: { select: { fileName: true } },
        newDocument: { select: { fileName: true } },
      },
    });
    if (!job) throw new NotFoundException('Compare job not found');
    return job;
  }

  async findRecent(userId: string) {
    return this.prisma.compareJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        oldDocument: { select: { fileName: true } },
        newDocument: { select: { fileName: true } },
      },
    });
  }
}
