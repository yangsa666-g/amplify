import { Injectable, BadGatewayException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 60; // 3s * 60 = 3 minutes max

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(private config: ConfigService) {}

  private get endpoint(): string {
    return this.config.get<string>('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT', '').replace(/\/$/, '');
  }

  private get apiKey(): string {
    return this.config.get<string>('AZURE_DOCUMENT_INTELLIGENCE_KEY', '');
  }

  get isConfigured(): boolean {
    const ok = !!(this.endpoint && this.apiKey);
    if (!ok) {
      this.logger.warn(
        'Azure Document Intelligence is NOT configured ' +
          '(AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT / AZURE_DOCUMENT_INTELLIGENCE_KEY missing). ' +
          'Falling back to pdf-parse which CANNOT OCR scanned documents.',
      );
    }
    return ok;
  }

  /**
   * Convert any HTML <table> blocks embedded in ADI markdown output to Markdown table syntax.
   * ADI's prebuilt-layout model emits tables as HTML even when outputContentFormat=markdown.
   */
  private convertHtmlTablesToMarkdown(content: string): string {
    return content.replace(/<table[\s\S]*?<\/table>/gi, (tableHtml) => {
      try {
        // Wrap with blank lines so the Markdown renderer treats it as a block-level table
        return '\n\n' + this.htmlTableToMarkdown(tableHtml) + '\n\n';
      } catch {
        return tableHtml;
      }
    });
  }

  private htmlTableToMarkdown(tableHtml: string): string {
    const rows: string[][] = [];

    // Match every <tr>...</tr> (handles thead/tbody transparently)
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch: RegExpExecArray | null;
    while ((trMatch = trRegex.exec(tableHtml)) !== null) {
      const rowHtml = trMatch[1];
      const cells: string[] = [];

      // Match <th> and <td> cells
      const cellRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
      let cellMatch: RegExpExecArray | null;
      while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
        const cellText = cellMatch[1]
          .replace(/<br\s*\/?>/gi, ' ') // <br> → space
          // Decode entities in a single pass (not chained replaces) so an
          // already-encoded entity like `&amp;lt;` can only ever be decoded
          // one level, never fully unescaped into a live `<script>` tag.
          .replace(/&(amp|nbsp|lt|gt|quot|#39|apos);/g, (_match, entity: string) => {
            switch (entity) {
              case 'amp':
                return '&';
              case 'nbsp':
                return ' ';
              case 'lt':
                return '<';
              case 'gt':
                return '>';
              case 'quot':
                return '"';
              case '#39':
              case 'apos':
                return "'";
              default:
                return _match;
            }
          })
          // Strip HTML tags *after* decoding entities so nothing smuggled in
          // via entity-encoding (e.g. `&lt;script&gt;`) survives sanitization.
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        cells.push(cellText);
      }

      if (cells.length > 0) rows.push(cells);
    }

    if (rows.length === 0) return tableHtml;

    const maxCols = Math.max(...rows.map((r) => r.length));
    const lines: string[] = [];

    rows.forEach((row, idx) => {
      // Pad short rows
      while (row.length < maxCols) row.push('');
      lines.push('| ' + row.join(' | ') + ' |');
      // Separator row after the first (header) row
      if (idx === 0) {
        lines.push('| ' + Array(maxCols).fill('---').join(' | ') + ' |');
      }
    });

    return lines.join('\n');
  }

  async extractMarkdownFromPdf(buffer: Buffer): Promise<string> {
    const base64Source = buffer.toString('base64');

    // ocrHighResolution is required for scanned / low-quality PDFs
    const analyzeUrl =
      `${this.endpoint}/documentintelligence/documentModels/prebuilt-layout:analyze` +
      `?api-version=2024-11-30&outputContentFormat=markdown&features=ocrHighResolution`;

    this.logger.log(`Submitting OCR job to Azure Document Intelligence`);
    this.logger.debug(`POST ${analyzeUrl}`);

    const submitResp = await axios
      .post(
        analyzeUrl,
        { base64Source },
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
          validateStatus: (s) => s === 202,
        },
      )
      .catch((err) => {
        const status = err.response?.status;
        const msg = err.response?.data?.error?.message || err.message;
        throw new BadGatewayException(
          `Azure Document Intelligence submit failed (${status}): ${msg}`,
        );
      });

    const operationLocation = submitResp.headers['operation-location'] as string | undefined;
    if (!operationLocation) {
      throw new BadGatewayException(
        'Azure Document Intelligence did not return operation-location header',
      );
    }

    this.logger.log(`OCR job accepted, polling: ${operationLocation}`);

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await new Promise<void>((r) => setTimeout(r, POLL_INTERVAL_MS));

      const pollResp = await axios
        .get(operationLocation, {
          headers: { 'Ocp-Apim-Subscription-Key': this.apiKey },
        })
        .catch((err) => {
          const status = err.response?.status;
          const msg = err.response?.data?.error?.message || err.message;
          throw new BadGatewayException(
            `Azure Document Intelligence poll failed (${status}): ${msg}`,
          );
        });

      const { status, analyzeResult } = pollResp.data as {
        status: string;
        analyzeResult?: { content?: string };
      };

      if (status === 'succeeded') {
        const rawContent = analyzeResult?.content ?? '';
        const content = this.convertHtmlTablesToMarkdown(rawContent);
        this.logger.log(`OCR succeeded — extracted ${content.length} characters of markdown`);
        return content;
      }

      if (status === 'failed') {
        const errorMsg = (pollResp.data as any)?.error?.message ?? 'unknown error';
        throw new BadGatewayException(
          `Azure Document Intelligence OCR analysis failed: ${errorMsg}`,
        );
      }

      this.logger.debug(`OCR status: ${status} (attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS})`);
    }

    throw new BadGatewayException('Azure Document Intelligence OCR timed out after 3 minutes');
  }
}
