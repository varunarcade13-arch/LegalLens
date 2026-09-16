import { LegalDocument } from '../domain/LegalDocument';
import { DocumentChunk } from '../domain/DocumentChunk';
import { NotFoundError, ForbiddenError, ValidationError } from '../domain/Errors';
import {
  IDocumentRepository,
  IVectorStore,
  IEmbeddingService,
  IDocumentParser,
  IFileValidator,
  IAnalysisRepository,
  IChatRepository,
  IBriefingRepository,
} from '../ports';

export interface UploadDocumentDTO {
  userId: string;
  title?: string;
  file: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  };
}

export class UploadDocumentUseCase {
  constructor(
    private documentRepository: IDocumentRepository,
    private documentParser: IDocumentParser,
    private embeddingService: IEmbeddingService,
    private vectorStore: IVectorStore,
    private fileValidator: IFileValidator
  ) {}

  public async execute(dto: UploadDocumentDTO): Promise<LegalDocument> {
    if (!dto.userId) {
      throw new ValidationError('User ID is required');
    }

    const validation = this.fileValidator.validate(dto.file);
    if (!validation.valid) {
      throw new ValidationError(validation.error || 'Invalid document file');
    }

    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const parsed = await this.documentParser.parse(dto.file.buffer, validation.safeFilename);

    const title = dto.title?.trim() || validation.safeFilename.replace(/\.[^/.]+$/, '');
    const now = new Date();

    const legalDoc = new LegalDocument({
      id: docId,
      userId: dto.userId,
      title,
      originalFilename: validation.safeFilename,
      mimeType: validation.mimeType,
      fileSizeBytes: dto.file.size,
      storagePath: `uploads/${dto.userId}/${docId}_${validation.safeFilename}`,
      pageCount: parsed.pageCount,
      characterCount: parsed.text.length,
      status: 'ready',
      createdAt: now,
      updatedAt: now,
    });

    await this.documentRepository.create(legalDoc);

    // Chunking document
    const chunks = this.chunkDocument(docId, parsed.pages, parsed.text);
    if (chunks.length > 0) {
      const texts = chunks.map((c) => c.content);
      const embeddings = await this.embeddingService.generateEmbeddings(texts, 'RETRIEVAL_DOCUMENT');
      chunks.forEach((chunk, idx) => {
        if (embeddings[idx]) {
          chunk.setEmbedding(embeddings[idx]);
        }
      });
      await this.vectorStore.upsertChunks(chunks);
    }

    return legalDoc;
  }

  private chunkDocument(
    docId: string,
    pages: { pageNumber: number; text: string }[],
    fullText: string
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let chunkIndex = 0;

    if (pages && pages.length > 0) {
      for (const page of pages) {
        const sections = this.splitIntoSections(page.text);
        for (const sec of sections) {
          const chunkId = `chk_${docId}_${chunkIndex}`;
          chunks.push(
            new DocumentChunk({
              id: chunkId,
              documentId: docId,
              chunkIndex,
              pageNumber: page.pageNumber,
              sectionHeading: sec.heading,
              content: sec.content,
              tokenCount: Math.ceil(sec.content.length / 4),
            })
          );
          chunkIndex++;
        }
      }
    } else {
      const sections = this.splitIntoSections(fullText);
      for (const sec of sections) {
        const chunkId = `chk_${docId}_${chunkIndex}`;
        chunks.push(
          new DocumentChunk({
            id: chunkId,
            documentId: docId,
            chunkIndex,
            pageNumber: 1,
            sectionHeading: sec.heading,
            content: sec.content,
            tokenCount: Math.ceil(sec.content.length / 4),
          })
        );
        chunkIndex++;
      }
    }

    return chunks;
  }

  private splitIntoSections(text: string): { heading: string; content: string }[] {
    const rawParagraphs = text.split(/\n{2,}/);
    const results: { heading: string; content: string }[] = [];
    let currentHeading = 'Preamble / Introduction';
    let currentBuffer = '';

    for (const rawPara of rawParagraphs) {
      const para = rawPara.trim();
      if (!para) continue;

      // Check if line looks like a legal heading (e.g., "Section 2. Termination", "3. Payment", "ARTICLE IV")
      const headingMatch = para.match(/^(?:Section|Article|\d+\.|\([a-z\d]+\))\s*([^\n.:]{3,60})/i);
      if (headingMatch && para.length < 80) {
        if (currentBuffer.length > 0) {
          results.push({ heading: currentHeading, content: currentBuffer.trim() });
          currentBuffer = '';
        }
        currentHeading = para;
        continue;
      }

      if (currentBuffer.length + para.length > 1000) {
        results.push({ heading: currentHeading, content: currentBuffer.trim() });
        currentBuffer = para;
      } else {
        currentBuffer += (currentBuffer ? '\n\n' : '') + para;
      }
    }

    if (currentBuffer.trim().length > 0) {
      results.push({ heading: currentHeading, content: currentBuffer.trim() });
    }

    if (results.length === 0 && text.trim().length > 0) {
      results.push({ heading: 'General Provisions', content: text.trim() });
    }

    return results;
  }
}

export class GetDocumentUseCase {
  constructor(private documentRepository: IDocumentRepository) {}

  public async execute(documentId: string, userId: string): Promise<LegalDocument> {
    const doc = await this.documentRepository.findById(documentId);
    if (!doc) {
      throw new NotFoundError('Document not found');
    }
    if (!doc.isOwnedBy(userId)) {
      throw new ForbiddenError('Access to this document is denied');
    }
    return doc;
  }
}

export class ListDocumentsUseCase {
  constructor(private documentRepository: IDocumentRepository) {}

  public async execute(userId: string): Promise<LegalDocument[]> {
    return this.documentRepository.findByUserId(userId);
  }
}

export class DeleteDocumentUseCase {
  constructor(
    private documentRepository: IDocumentRepository,
    private vectorStore: IVectorStore,
    private analysisRepository: IAnalysisRepository,
    private chatRepository: IChatRepository,
    private briefingRepository: IBriefingRepository
  ) {}

  public async execute(documentId: string, userId: string): Promise<void> {
    const doc = await this.documentRepository.findById(documentId);
    if (!doc) {
      throw new NotFoundError('Document not found');
    }
    if (!doc.isOwnedBy(userId)) {
      throw new ForbiddenError('Access to this document is denied');
    }

    await this.vectorStore.deleteByDocumentId(documentId);
    await this.analysisRepository.deleteByDocumentId(documentId);
    await this.chatRepository.clearMessages(documentId, userId);
    await this.briefingRepository.delete(documentId);
    await this.documentRepository.delete(documentId);
  }
}

export interface SearchResultItem {
  chunkId: string;
  pageNumber: number;
  sectionHeading: string;
  matchedSnippet: string;
}

export class SearchDocumentUseCase {
  constructor(
    private documentRepository: IDocumentRepository,
    private vectorStore: IVectorStore
  ) {}

  public async execute(documentId: string, userId: string, query: string): Promise<SearchResultItem[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const doc = await this.documentRepository.findById(documentId);
    if (!doc) {
      throw new NotFoundError('Document not found');
    }
    if (!doc.isOwnedBy(userId)) {
      throw new ForbiddenError('Access to this document is denied');
    }

    const matchedChunks = await this.vectorStore.searchKeyword(documentId, query.trim());
    const lowerQuery = query.toLowerCase();

    return matchedChunks.map((chunk) => {
      const idx = chunk.content.toLowerCase().indexOf(lowerQuery);
      let snippet = chunk.content;
      if (idx !== -1) {
        const start = Math.max(0, idx - 60);
        const end = Math.min(chunk.content.length, idx + query.length + 60);
        snippet = (start > 0 ? '...' : '') + chunk.content.substring(start, end) + (end < chunk.content.length ? '...' : '');
      }
      return {
        chunkId: chunk.id,
        pageNumber: chunk.pageNumber,
        sectionHeading: chunk.sectionHeading,
        matchedSnippet: snippet,
      };
    });
  }
}

export class ReindexDocumentUseCase {
  constructor(
    private documentRepository: IDocumentRepository,
    private vectorStore: IVectorStore,
    private embeddingService: IEmbeddingService
  ) {}

  public async execute(documentId: string, userId: string): Promise<number> {
    const doc = await this.documentRepository.findById(documentId);
    if (!doc) {
      throw new NotFoundError('Document not found');
    }
    if (!doc.isOwnedBy(userId)) {
      throw new ForbiddenError('Access to this document is denied');
    }

    const chunks = await this.vectorStore.searchKeyword(documentId, '');
    if (chunks.length === 0) {
      return 0;
    }

    const texts = chunks.map((c) => c.content);
    const newEmbeddings = await this.embeddingService.generateEmbeddings(texts, 'RETRIEVAL_DOCUMENT');

    chunks.forEach((chunk, idx) => {
      if (newEmbeddings[idx]) {
        chunk.setEmbedding(newEmbeddings[idx]);
      }
    });

    await this.vectorStore.upsertChunks(chunks);
    return chunks.length;
  }
}

