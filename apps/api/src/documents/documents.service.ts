import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ParserService } from './parser.service';
import { isAzureStorageConfigured, uploadBlob, streamBlobToResponse } from '../common/blob-storage';
import { getUploadDir } from '../common/storage';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const MAX_SIZE_MB = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '20', 10);

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private prisma: PrismaService,
    private parser: ParserService,
  ) {}

  async upload(userId: string, file: Express.Multer.File) {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      throw new BadRequestException(`File exceeds ${MAX_SIZE_MB}MB limit`);
    }

    if (!this.parser.isSupported(file.mimetype, file.originalname)) {
      throw new BadRequestException('Unsupported file type. Supported: PDF, DOCX, TXT');
    }

    // Resolve file buffer (memoryStorage provides buffer; diskStorage provides path)
    let buffer: Buffer;
    if (file.buffer) {
      buffer = file.buffer;
    } else {
      buffer = fs.readFileSync(file.path);
      fs.unlinkSync(file.path);
    }

    // Persist the file
    let storagePath: string;
    if (isAzureStorageConfigured()) {
      storagePath = await uploadBlob(userId, file.originalname, buffer, file.mimetype);
      this.logger.log(`Uploaded to Azure Blob: ${storagePath}`);
    } else {
      // Local dev: write to disk
      const dir = getUploadDir();
      const filename = `${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname)}`;
      storagePath = path.join(dir, filename);
      fs.writeFileSync(storagePath, buffer);
      this.logger.log(`Saved locally: ${storagePath}`);
    }

    const doc = await this.prisma.document.create({
      data: {
        userId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        storagePath,
        textExtractionStatus: 'pending',
      },
    });

    let extractedText: string | null = null;
    let status: 'success' | 'failed' = 'success';
    let extractionError: string | null = null;

    const extractionStart = Date.now();
    try {
      extractedText = await this.parser.extractText(buffer, file.mimetype, file.originalname);
      if (!extractedText) {
        status = 'failed';
        extractionError = 'Extraction returned empty content';
      }
    } catch (err: any) {
      status = 'failed';
      extractionError = err?.response?.message ?? err?.message ?? String(err);
      this.logger.error(
        `Text extraction failed for document ${doc.id}: ${extractionError}`,
        err?.stack,
      );
    }
    const extractionMs = Date.now() - extractionStart;

    const updated = await this.prisma.document.update({
      where: { id: doc.id },
      data: { extractedText, textExtractionStatus: status, extractionError, extractionMs },
    });

    return {
      id: updated.id,
      fileName: updated.fileName,
      fileSize: updated.fileSize,
      textExtractionStatus: updated.textExtractionStatus,
      extractionError: updated.extractionError,
      extractionMs: updated.extractionMs,
    };
  }

  async findOne(id: string, userId: string, role?: string) {
    const isAdmin = role === 'admin';
    const doc = await this.prisma.document.findFirst({
      where: isAdmin ? { id } : { id, userId },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async getExtractedText(id: string, userId: string, role?: string): Promise<string> {
    const doc = await this.findOne(id, userId, role);
    if (doc.textExtractionStatus !== 'success' || !doc.extractedText) {
      const reason = (doc as any).extractionError ? `: ${(doc as any).extractionError}` : '';
      throw new BadRequestException(`Text extraction failed${reason}`);
    }
    return doc.extractedText;
  }

  async downloadToResponse(id: string, userId: string, res: any, role?: string): Promise<void> {
    const doc = await this.findOne(id, userId, role);
    if (isAzureStorageConfigured()) {
      await streamBlobToResponse(doc.storagePath, doc.fileName, res);
    } else {
      res.download(doc.storagePath, doc.fileName);
    }
  }
}
