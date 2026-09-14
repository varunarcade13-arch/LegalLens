import { describe, it, expect, vi } from 'vitest';
import { TxtDocumentParser } from '../../src/infrastructure/parsers/TxtDocumentParser';
import { PdfDocumentParser } from '../../src/infrastructure/parsers/PdfDocumentParser';
import { DocxDocumentParser } from '../../src/infrastructure/parsers/DocxDocumentParser';
import { DocumentParserFactory } from '../../src/infrastructure/parsers/DocumentParserFactory';
import { ValidationError } from '../../src/core/domain/Errors';

import mammoth from 'mammoth';

vi.mock('pdf-parse/lib/pdf-parse.js', () => {
  return {
    default: vi.fn(async (buffer: Buffer) => {
      const str = buffer.toString('utf-8');
      if (str.includes('CORRUPT_PDF')) {
        throw new Error('Invalid PDF header');
      }
      if (str.includes('NON_ERROR_CORRUPT')) {
        throw 'Raw PDF error string';
      }
      if (str.includes('EMPTY_PDF')) {
        return {
          text: '',
          numpages: 1,
        };
      }
      if (str.includes('NULL_TEXT_PDF')) {
        return {
          text: null,
          numpages: 0,
        };
      }
      return {
        text: 'This is page one content.\n\nThis is page two content.',
        numpages: 2,
      };
    }),
  };
});

describe('Infrastructure Parsers', () => {
  describe('TxtDocumentParser', () => {
    const parser = new TxtDocumentParser();

    it('identifies supported mime types and extensions', () => {
      expect(parser.supports('text/plain', 'doc.txt')).toBe(true);
      expect(parser.supports('application/octet-stream', 'doc.text')).toBe(true);
      expect(parser.supports('application/pdf', 'doc.pdf')).toBe(false);
    });

    it('parses text documents with form feed page breaks and long content breaks', async () => {
      const textWithFormFeed = 'Page One Content\fPage Two Content';
      const res1 = await parser.parse(Buffer.from(textWithFormFeed), 'doc.txt');
      expect(res1.pageCount).toBe(2);
      expect(res1.pages[0].text).toBe('Page One Content');
      expect(res1.pages[1].text).toBe('Page Two Content');

      const longText = 'A'.repeat(2000) + '\nParagraph break\n' + 'B'.repeat(1500);
      const res2 = await parser.parse(Buffer.from(longText), 'long.txt');
      expect(res2.pageCount).toBeGreaterThan(1);
    });

    it('parses short text document into single page', async () => {
      const res = await parser.parse(Buffer.from('Short agreement text'), 'short.txt');
      expect(res.pageCount).toBe(1);
      expect(res.text).toBe('Short agreement text');
    });
  });

  describe('PdfDocumentParser', () => {
    const parser = new PdfDocumentParser();

    it('identifies supported mime types and extensions', () => {
      expect(parser.supports('application/pdf', 'doc.pdf')).toBe(true);
      expect(parser.supports('text/plain', 'doc.txt')).toBe(false);
    });

    it('handles corrupt pdf buffer by throwing ValidationError', async () => {
      const invalidPdfBuffer = Buffer.from('CORRUPT_PDF');
      await expect(parser.parse(invalidPdfBuffer, 'corrupt.pdf')).rejects.toThrow(ValidationError);
    });

    it('parses valid PDF document with pages', async () => {
      const validPdfBuffer = Buffer.from('VALID_PDF');
      const res = await parser.parse(validPdfBuffer, 'agreement.pdf');
      expect(res.pageCount).toBe(2);
      expect(res.pages).toHaveLength(2);
    });

    it('parses empty text PDF document with fallback', async () => {
      const emptyPdfBuffer = Buffer.from('EMPTY_PDF');
      const res = await parser.parse(emptyPdfBuffer, 'empty.pdf');
      expect(res.pageCount).toBe(1);
      expect(res.pages).toHaveLength(1);
    });

    it('handles null text and numpages 0 fallback in PDF', async () => {
      const nullPdfBuffer = Buffer.from('NULL_TEXT_PDF');
      const res = await parser.parse(nullPdfBuffer, 'null.pdf');
      expect(res.pageCount).toBe(1);
      expect(res.text).toBe('');
      expect(res.pages).toEqual([{ pageNumber: 1, text: '' }]);
    });

    it('handles non-Error exception thrown during PDF parsing', async () => {
      const nonErrorBuffer = Buffer.from('NON_ERROR_CORRUPT');
      await expect(parser.parse(nonErrorBuffer, 'corrupt.pdf')).rejects.toThrow('Failed to parse PDF document: Corrupt PDF file');
    });
  });

  describe('DocxDocumentParser', () => {
    const parser = new DocxDocumentParser();

    it('identifies supported mime types and extensions', () => {
      expect(
        parser.supports(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'doc.docx'
        )
      ).toBe(true);
      expect(parser.supports('application/msword', 'doc.doc')).toBe(true);
      expect(parser.supports('text/plain', 'doc.txt')).toBe(false);
    });

    it('handles corrupt docx buffer by throwing ValidationError', async () => {
      const invalidDocxBuffer = Buffer.from('NOT A DOCX');
      await expect(parser.parse(invalidDocxBuffer, 'corrupt.docx')).rejects.toThrow(ValidationError);
    });

    it('handles empty text extracted from docx with single page fallback', async () => {
      vi.spyOn(mammoth, 'extractRawText').mockResolvedValueOnce({ value: '', messages: [] });
      const res = await parser.parse(Buffer.from('mock docx'), 'empty.docx');
      expect(res.pageCount).toBe(1);
      expect(res.text).toBe('');
      expect(res.pages).toEqual([{ pageNumber: 1, text: '' }]);
    });

    it('handles non-Error exception thrown during DOCX parsing', async () => {
      vi.spyOn(mammoth, 'extractRawText').mockRejectedValueOnce('raw docx error string');
      await expect(parser.parse(Buffer.from('corrupt'), 'corrupt.docx')).rejects.toThrow(
        'Failed to parse Word document: Corrupt DOCX file'
      );
    });
  });

  describe('DocumentParserFactory', () => {
    it('delegates to matching parser and rejects unsupported files', async () => {
      const factory = new DocumentParserFactory();

      expect(factory.supports('text/plain', 'test.txt')).toBe(true);
      expect(factory.supports('application/pdf', 'test.pdf')).toBe(true);
      expect(
        factory.supports(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'test.docx'
        )
      ).toBe(true);
      expect(factory.supports('image/png', 'image.png')).toBe(false);

      const parsedTxt = await factory.parse(Buffer.from('Hello world contract'), 'contract.txt');
      expect(parsedTxt.text).toBe('Hello world contract');

      await expect(factory.parse(Buffer.from('binary'), 'malicious.exe')).rejects.toThrow(
        ValidationError
      );
    });
  });
});
