import { BadRequestException, Injectable } from '@nestjs/common';
import { Workbook, type Cell } from 'exceljs';

function escapeMarkdown(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('|', '\\|').replace(/\r?\n/g, '<br>');
}

function getCellText(cell: Cell): string {
  const displayedValue = cell.text.trim();
  if (!cell.formula) return displayedValue;
  return displayedValue ? `${displayedValue} (formula: =${cell.formula})` : `=${cell.formula}`;
}

@Injectable()
export class SpreadsheetParserService {
  async extractTextFromXlsx(buffer: Buffer): Promise<string> {
    const workbook = new Workbook();

    try {
      await workbook.xlsx.load(Uint8Array.from(buffer).buffer);
    } catch {
      throw new BadRequestException('Invalid XLSX file');
    }

    const worksheets = workbook.worksheets.flatMap((worksheet) => {
      const rows: string[] = [];

      worksheet.eachRow((row, rowNumber) => {
        const cells: string[] = [];

        row.eachCell((cell) => {
          const value = getCellText(cell);
          if (value) cells.push(`**${cell.address}**: ${escapeMarkdown(value)}`);
        });

        if (cells.length > 0) rows.push(`- Row ${rowNumber}: ${cells.join(' | ')}`);
      });

      if (rows.length === 0) return [];
      return [`## Worksheet: ${escapeMarkdown(worksheet.name)}\n\n${rows.join('\n')}`];
    });

    return worksheets.join('\n\n').trim();
  }
}
