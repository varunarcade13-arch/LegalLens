import { User } from '../domain/User';
import { LegalDocument } from '../domain/LegalDocument';
import { DocumentChunk } from '../domain/DocumentChunk';
import { DocumentAnalysis, DocumentAnalysisProps } from '../domain/DocumentAnalysis';
import { Comparison, ComparisonProps } from '../domain/Comparison';
import { ChatMessage, StructuredAnswer } from '../domain/ChatMessage';
import { LegalBriefing, LegalBriefingProps } from '../domain/LegalBriefing';
import { z } from 'zod';

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
export type EmbeddingTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

export interface IEmbeddingProvider {
  readonly name: string;
  generateEmbedding(text: string, taskType?: EmbeddingTaskType): Promise<number[]>;
  generateEmbeddings(texts: string[], taskType?: EmbeddingTaskType): Promise<number[][]>;
}

export interface IEmbeddingService {
  generateEmbedding(text: string, taskType?: EmbeddingTaskType): Promise<number[]>;
  generateEmbeddings(texts: string[], taskType?: EmbeddingTaskType): Promise<number[][]>;
}

export const DocumentAnalysisAiSchema = z.object({
  documentType: z.string().min(1),
  partiesInvolved: z.array(z.string()).default([]),
  effectiveDate: z.string().nullable().default(null),
  expirationDate: z.string().nullable().default(null),
  jurisdiction: z.string().nullable().default(null),
  highLevelSummary: z.string().min(1),
  plainLanguageSummary: z.object({
    whatThisDocumentIsAbout: z.string().default(''),
    whatYouAreAgreeingTo: z.array(z.string()).default([]),
    whatTheOtherPartyIsAgreeingTo: z.array(z.string()).default([]),
    yourKeyResponsibilities: z.array(z.string()).default([]),
    yourRights: z.array(z.string()).default([]),
    importantDates: z.array(z.string()).default([]),
    financialObligations: z.array(z.string()).default([]),
    terminationConditions: z.array(z.string()).default([]),
  }),
  extractedFacts: z
    .array(
      z.object({
        category: z.string(),
        fact: z.string(),
        verbatimExcerpt: z.string(),
        pageNumber: z.number().default(1),
      })
    )
    .default([]),
  clauses: z
    .array(
      z.object({
        category: z.string(),
        title: z.string(),
        originalText: z.string(),
        plainExplanation: z.string(),
        whyItMatters: z.string(),
        concernLevel: z.enum(['informational', 'review_carefully', 'high_attention']),
        pageNumber: z.number().default(1),
        sectionHeading: z.string().default('General'),
      })
    )
    .default([]),
  findings: z
    .array(
      z.object({
        category: z.enum(['informational', 'review_carefully', 'high_attention']),
        finding: z.string(),
        whyItMatters: z.string(),
        sourceReference: z.string(),
        pageNumber: z.number().default(1),
        sectionHeading: z.string().default('General'),
        questionsToConsider: z.array(z.string()).default([]),
        suggestedProfessionalFollowUp: z
          .string()
          .default('Consider discussing with a legal professional.'),
      })
    )
    .default([]),
});

export const ClauseDifferenceAiSchema = z.object({
  category: z.string(),
  documentA: z.string(),
  documentB: z.string(),
  difference: z.string(),
  whyItMatters: z.string(),
  impactLevel: z.enum(['low', 'moderate', 'significant']),
});

export const ComparisonAiSchema = z.object({
  executiveSummary: z.string(),
  addedClauses: z.array(ClauseDifferenceAiSchema).default([]),
  removedClauses: z.array(ClauseDifferenceAiSchema).default([]),
  modifiedClauses: z.array(ClauseDifferenceAiSchema).default([]),
  changedObligations: z.array(ClauseDifferenceAiSchema).default([]),
  changedFinancialTerms: z.array(ClauseDifferenceAiSchema).default([]),
  changedDates: z.array(ClauseDifferenceAiSchema).default([]),
  changedTermination: z.array(ClauseDifferenceAiSchema).default([]),
  changedLiability: z.array(ClauseDifferenceAiSchema).default([]),
  changedDisputeResolution: z.array(ClauseDifferenceAiSchema).default([]),
});

export const CitationAiSchema = z.object({
  chunkId: z.string(),
  pageNumber: z.number().default(1),
  sectionHeading: z.string().default(''),
  textSnippet: z.string(),
});

export const GroundedAnswerAiSchema = z.object({
  shortAnswer: z.string(),
  whatTheDocumentSays: z.string(),
  whyItMatters: z.string(),
  sourceCitations: z.array(CitationAiSchema).default([]),
  questionsForLawyer: z.array(z.string()).default([]),
  grounded: z.boolean().default(true),
  groundingConfidence: z.number().optional(),
  aiProvider: z.string().optional(),
});

export const ActionChecklistItemAiSchema = z.object({
  id: z.string(),
  label: z.string(),
  category: z.string(),
  completed: z.boolean().default(false),
});

export const LawyerChecklistAiSchema = z.object({
  questionsToAsk: z.array(z.string()).default([]),
  documentsToBring: z.array(z.string()).default([]),
  importantDeadlines: z.array(z.string()).default([]),
  keyConcerns: z.array(z.string()).default([]),
  clarificationAreas: z.array(z.string()).default([]),
});

export const LawyerBriefingAiSchema = z.object({
  conciseSummary: z.string(),
  lawyerChecklist: LawyerChecklistAiSchema,
  actionChecklist: z.array(ActionChecklistItemAiSchema).default([]),
});


export interface VectorSearchResult {
  chunk: DocumentChunk;
  score: number;
}

export interface IVectorStore {
  upsertChunks(chunks: DocumentChunk[]): Promise<void>;
  searchSimilar(documentId: string, queryEmbedding: number[], topK?: number): Promise<VectorSearchResult[]>;
  searchKeyword(documentId: string, query: string): Promise<DocumentChunk[]>;
  deleteByDocumentId(documentId: string): Promise<void>;
  invalidateIncompatibleEmbeddings(expectedDimension: number): Promise<number>;
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
  sanitizeRetrievedContext(text: string): string;
  wrapUntrustedContext(contextText: string): string;
  wrapLegalDocumentContext(contextText: string): string;
  getSystemGuardrails(): string;
}
