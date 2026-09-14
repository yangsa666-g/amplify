import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { ParserService } from './parser.service';
import { OcrService } from './ocr.service';
import { SpreadsheetParserService } from './spreadsheet-parser.service';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, ParserService, OcrService, SpreadsheetParserService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
