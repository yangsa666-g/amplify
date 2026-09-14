import { describe, expect, it } from 'vitest';
import { Workbook } from 'exceljs';
import { SpreadsheetParserService } from './spreadsheet-parser.service';

async function createWorkbookBuffer(): Promise<Buffer> {
  const workbook = new Workbook();
  const summary = workbook.addWorksheet('Summary');
  summary.addRow(['Name', 'Amount']);
  summary.addRow(['Service | Plan', 1250]);
  summary.getCell('C2').value = { formula: 'B2*2', result: 2500 };

  workbook.addWorksheet('Empty');

  const notes = workbook.addWorksheet('Notes');
  notes.getCell('B3').value = 'First line\nSecond line';

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe('SpreadsheetParserService', () => {
  const service = new SpreadsheetParserService();

  it('extracts workbook content with worksheet and cell positions', async () => {
    const result = await service.extractTextFromXlsx(await createWorkbookBuffer());

    expect(result).toContain('## Worksheet: Summary');
    expect(result).toContain('**A1**: Name | **B1**: Amount');
    expect(result).toContain('**A2**: Service \\| Plan | **B2**: 1250');
    expect(result).toContain('**C2**: 2500 (formula: =B2*2)');
    expect(result).toContain('## Worksheet: Notes');
    expect(result).toContain('**B3**: First line<br>Second line');
    expect(result).not.toContain('## Worksheet: Empty');
  });

  it('rejects invalid XLSX data', async () => {
    await expect(service.extractTextFromXlsx(Buffer.from('not-an-xlsx'))).rejects.toThrow(
      'Invalid XLSX file',
    );
  });
});
