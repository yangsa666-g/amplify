import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import * as path from 'path';
import * as mammoth from 'mammoth';
import { OcrService } from './ocr.service';

const SUPPORTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];
const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.txt'];

@Injectable()
export class ParserService {
  constructor(private ocr: OcrService) {}

  async extractText(buffer: Buffer, mimeType: string, originalName: string): Promise<string> {
    const ext = path.extname(originalName).toLowerCase();

    if (ext === '.pdf' || mimeType === 'application/pdf') {
      if (!this.ocr.isConfigured) {
        throw new InternalServerErrorException(
          'Azure Document Intelligence is not configured. ' +
            'Set AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and AZURE_DOCUMENT_INTELLIGENCE_KEY.',
        );
      }
      return this.ocr.extractMarkdownFromPdf(buffer);
    }

    if (
      ext === '.docx' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value?.trim() || '';
    }

    if (ext === '.txt' || mimeType === 'text/plain') {
      return buffer.toString('utf-8').trim();
    }

    throw new BadRequestException(`Unsupported file type: ${ext}`);
  }

  isSupported(mimeType: string, filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return SUPPORTED_EXTENSIONS.includes(ext) || SUPPORTED_TYPES.includes(mimeType);
  }
}
