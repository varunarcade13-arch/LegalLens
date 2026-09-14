import { User } from '../domain/User';
import { LegalDocument } from '../domain/LegalDocument';
import { DocumentChunk } from '../domain/DocumentChunk';
import { DocumentAnalysis, DocumentAnalysisProps } from '../domain/DocumentAnalysis';
import { Comparison, ComparisonProps } from '../domain/Comparison';
import { ChatMessage, StructuredAnswer } from '../domain/ChatMessage';
import { LegalBriefing, LegalBriefingProps } from '../domain/LegalBriefing';

export interface IUserRepository {
  create(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IDocumentRepository {
  create(doc: LegalDocument): Promise<void>;
  findById(id: string): Promise<LegalDocument | null>;
  findByUserId(userId: string): Promise<LegalDocument[]>;
  update(doc: LegalDocument): Promise<void>;
  delete(id: string): Promise<void>;
  countByUserId(userId: string): Promise<number>;
}

export interface IAnalysisRepository {
  save(analysis: DocumentAnalysis): Promise<void>;
  findByDocumentId(documentId: string): Promise<DocumentAnalysis | null>;
  deleteByDocumentId(documentId: string): Promise<void>;
}

export interface IComparisonRepository {
  save(comparison: Comparison): Promise<void>;
  findById(id: string): Promise<Comparison | null>;
  findByUserId(userId: string): Promise<Comparison[]>;
  delete(id: string): Promise<void>;
}

export interface IChatRepository {
  saveMessage(msg: ChatMessage): Promise<void>;
  getMessages(documentId: string, userId: string): Promise<ChatMessage[]>;
  clearMessages(documentId: string, userId: string): Promise<void>;
}

export interface IBriefingRepository {
  save(briefing: LegalBriefing): Promise<void>;
  findByDocumentId(documentId: string): Promise<LegalBriefing | null>;
  update(briefing: LegalBriefing): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface ParsedDocumentPage {
  pageNumber: number;
  text: string;
}

export interface ParsedDocumentResult {
  text: string;
  pageCount: number;
  pages: ParsedDocumentPage[];
}

export interface IDocumentParser {
  supports(mimeType: string, filename: string): boolean;
  parse(buffer: Buffer, filename: string): Promise<ParsedDocumentResult>;
}

export interface IEmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}

export interface VectorSearchResult {
  chunk: DocumentChunk;
  score: number;
}

export interface IVectorStore {
  upsertChunks(chunks: DocumentChunk[]): Promise<void>;
  searchSimilar(documentId: string, queryEmbedding: number[], topK?: number): Promise<VectorSearchResult[]>;
  searchKeyword(documentId: string, query: string): Promise<DocumentChunk[]>;
  deleteByDocumentId(documentId: string): Promise<void>;
}

export interface ILLMProvider {
  name: string;
  generateAnalysis(
    documentTitle: string,
    documentText: string,
    chunks: DocumentChunk[]
  ): Promise<Omit<DocumentAnalysisProps, 'id' | 'documentId' | 'createdAt' | 'updatedAt'>>;

  generateComparison(
    docA: { title: string; text: string },
    docB: { title: string; text: string }
  ): Promise<
    Omit<
      ComparisonProps,
      'id' | 'userId' | 'documentAId' | 'documentBId' | 'documentATitle' | 'documentBTitle' | 'createdAt'
    >
  >;

  answerGroundedQuestion(question: string, contextChunks: DocumentChunk[]): Promise<StructuredAnswer>;

  generateBriefing(
    documentTitle: string,
    analysis: DocumentAnalysis
  ): Promise<Omit<LegalBriefingProps, 'id' | 'userId' | 'documentId' | 'documentTitle' | 'createdAt' | 'updatedAt'>>;
}

export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface ITokenService {
  generateToken(payload: TokenPayload): string;
  verifyToken(token: string): TokenPayload;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

export interface IRateLimiter {
  checkLimit(key: string, maxRequests?: number, windowMs?: number): Promise<RateLimitResult>;
}

export interface FileValidationResult {
  valid: boolean;
  safeFilename: string;
  mimeType: string;
  error?: string;
}

export interface IFileValidator {
  validate(file: { originalname: string; mimetype: string; size: number; buffer: Buffer }): FileValidationResult;
}

export interface IPromptSecurityService {
  sanitizeInput(input: string): string;
  validateUserPrompt(prompt: string): void;
  wrapUntrustedContext(contextText: string): string;
  getSystemGuardrails(): string;
}
