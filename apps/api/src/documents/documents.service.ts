import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ParserService } from './parser.service';
import * as fs from 'fs';

const MAX_SIZE_MB = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '20', 10);

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private parser: ParserService,
  ) {}

  async upload(userId: string, file: Express.Multer.File) {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      fs.unlinkSync(file.path);
      throw new BadRequestException(`File exceeds ${MAX_SIZE_MB}MB limit`);
    }

    if (!this.parser.isSupported(file.mimetype, file.originalname)) {
      fs.unlinkSync(file.path);
      throw new BadRequestException('Unsupported file type. Supported: PDF, DOCX, TXT');
    }

    const doc = await this.prisma.document.create({
      data: {
        userId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        storagePath: file.path,
        textExtractionStatus: 'pending',
      },
    });

    let extractedText: string | null = null;
    let status: 'success' | 'failed' = 'success';

    try {
      extractedText = await this.parser.extractText(file.path, file.mimetype);
      if (!extractedText) status = 'failed';
    } catch {
      status = 'failed';
    }

    const updated = await this.prisma.document.update({
      where: { id: doc.id },
      data: { extractedText, textExtractionStatus: status },
    });

    return {
      id: updated.id,
      fileName: updated.fileName,
      fileSize: updated.fileSize,
      textExtractionStatus: updated.textExtractionStatus,
    };
  }

  async findOne(id: string, userId: string) {
    const doc = await this.prisma.document.findFirst({ where: { id, userId } });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async getExtractedText(id: string, userId: string): Promise<string> {
    const doc = await this.findOne(id, userId);
    if (doc.textExtractionStatus !== 'success' || !doc.extractedText) {
      throw new BadRequestException('Text extraction not available for this document');
    }
    return doc.extractedText;
  }
}

