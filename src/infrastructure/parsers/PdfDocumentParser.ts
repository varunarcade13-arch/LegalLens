// @ts-expect-error pdf-parse internal lib module export
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { IDocumentParser, ParsedDocumentResult } from '../../core/ports';
import { ValidationError } from '../../core/domain/Errors';

export class PdfDocumentParser implements IDocumentParser {
  public supports(mimeType: string, filename: string): boolean {
    const ext = filename.toLowerCase().split('.').pop();
    return mimeType === 'application/pdf' || ext === 'pdf';
  }

  public async parse(buffer: Buffer, _filename: string): Promise<ParsedDocumentResult> {
    try {
      const data = await pdfParse(buffer);
      const text = data.text ? data.text.replace(/\r\n/g, '\n').replace(/\r/g, '\n') : '';
      const pageCount = data.numpages || 1;

      // Extract per-page chunks or simulate from numpages
      const pageLength = Math.max(100, Math.ceil(text.length / pageCount));
      const pages: { pageNumber: number; text: string }[] = [];

      for (let i = 0; i < pageCount; i++) {
        const start = i * pageLength;
        const end = Math.min(text.length, (i + 1) * pageLength);
        pages.push({
          pageNumber: i + 1,
          text: text.substring(start, end).trim(),
        });
      }

      return {
        text,
        pageCount,
        pages,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Corrupt PDF file';
      throw new ValidationError(`Failed to parse PDF document: ${msg}`);
    }
  }
}
