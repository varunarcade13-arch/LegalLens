import { IDocumentParser, ParsedDocumentResult } from '../../core/ports';
import { ValidationError } from '../../core/domain/Errors';
import { PdfDocumentParser } from './PdfDocumentParser';
import { DocxDocumentParser } from './DocxDocumentParser';
import { TxtDocumentParser } from './TxtDocumentParser';

export class DocumentParserFactory implements IDocumentParser {
  private parsers: IDocumentParser[];

  constructor(customParsers?: IDocumentParser[]) {
    this.parsers = customParsers || [
      new PdfDocumentParser(),
      new DocxDocumentParser(),
      new TxtDocumentParser(),
    ];
  }

  public supports(mimeType: string, filename: string): boolean {
    return this.parsers.some((p) => p.supports(mimeType, filename));
  }

  public async parse(buffer: Buffer, filename: string): Promise<ParsedDocumentResult> {
    const ext = filename.toLowerCase().split('.').pop() || '';
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
      txt: 'text/plain',
    };
    const mimeType = mimeMap[ext] || 'application/octet-stream';

    for (const parser of this.parsers) {
      if (parser.supports(mimeType, filename)) {
        return parser.parse(buffer, filename);
      }
    }

    throw new ValidationError(
      `Unsupported document format for '${filename}'. Please upload a PDF, DOCX, or TXT file.`
    );
  }
}
