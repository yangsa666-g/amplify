import { describe, expect, it, vi } from 'vitest';
import { ParserService } from './parser.service';
import type { OcrService } from './ocr.service';
import type { SpreadsheetParserService } from './spreadsheet-parser.service';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function createService(isConfigured = true) {
  const ocr = {
    isConfigured,
    extractMarkdownFromPdf: vi.fn(),
  };
  const spreadsheetParser = {
    extractTextFromXlsx: vi.fn().mockResolvedValue('# Worksheet: Sheet1\n\nName Value'),
  };

  return {
    service: new ParserService(
      ocr as unknown as OcrService,
      spreadsheetParser as unknown as SpreadsheetParserService,
    ),
    ocr,
    spreadsheetParser,
  };
}

describe('ParserService', () => {
  it('supports XLSX by extension or MIME type', () => {
    const { service } = createService();

    expect(service.isSupported('', 'workbook.xlsx')).toBe(true);
    expect(service.isSupported(XLSX_MIME, 'workbook')).toBe(true);
  });

  it('does not support legacy XLS files', () => {
    const { service } = createService();

    expect(service.isSupported('application/vnd.ms-excel', 'workbook.xls')).toBe(false);
  });

  it('extracts XLSX content locally without OCR', async () => {
    const { service, ocr, spreadsheetParser } = createService(false);
    const buffer = Buffer.from('xlsx-content');

    await expect(service.extractText(buffer, XLSX_MIME, 'workbook.xlsx')).resolves.toBe(
      '# Worksheet: Sheet1\n\nName Value',
    );
    expect(spreadsheetParser.extractTextFromXlsx).toHaveBeenCalledWith(buffer);
    expect(ocr.extractMarkdownFromPdf).not.toHaveBeenCalled();
  });
});
