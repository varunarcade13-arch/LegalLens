import { IDocumentParser, ParsedDocumentResult } from '../../core/ports';

export class TxtDocumentParser implements IDocumentParser {
  public supports(mimeType: string, filename: string): boolean {
    const ext = filename.toLowerCase().split('.').pop();
    return mimeType === 'text/plain' || ext === 'txt' || ext === 'text';
  }

  public async parse(buffer: Buffer, _filename: string): Promise<ParsedDocumentResult> {
    const text = buffer.toString('utf-8');
    const cleaned = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Split into simulated pages (~2500 chars or form-feed '\f')
    const pageStrings = cleaned.includes('\f')
      ? cleaned.split('\f')
      : this.splitByLength(cleaned, 2500);

    const pages = pageStrings.map((pageText, idx) => ({
      pageNumber: idx + 1,
      text: pageText.trim(),
    }));

    return {
      text: cleaned,
      pageCount: Math.max(1, pages.length),
      pages,
    };
  }

  private splitByLength(text: string, maxLen: number): string[] {
    if (text.length <= maxLen) return [text];
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      let end = start + maxLen;
      if (end < text.length) {
        // Break at nearest newline if possible
        const lastNewline = text.lastIndexOf('\n', end);
        if (lastNewline > start + maxLen * 0.6) {
          end = lastNewline;
        }
      }
      chunks.push(text.substring(start, end));
      start = end;
    }
    return chunks;
  }
}
