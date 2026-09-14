import mammoth from 'mammoth';
import { IDocumentParser, ParsedDocumentResult } from '../../core/ports';
import { ValidationError } from '../../core/domain/Errors';

export class DocxDocumentParser implements IDocumentParser {
  public supports(mimeType: string, filename: string): boolean {
    const ext = filename.toLowerCase().split('.').pop();
    return (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword' ||
      ext === 'docx' ||
      ext === 'doc'
    );
  }

  public async parse(buffer: Buffer, _filename: string): Promise<ParsedDocumentResult> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = (result.value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

      // Estimate page count (~2500 chars per standard printed legal page)
      const pageCount = Math.max(1, Math.ceil(text.length / 2500));
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
      const msg = err instanceof Error ? err.message : 'Corrupt DOCX file';
      throw new ValidationError(`Failed to parse Word document: ${msg}`);
    }
  }
}
