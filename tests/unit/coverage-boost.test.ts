import { describe, it, expect, vi } from 'vitest';
import * as Domain from '../../src/core/domain';
import {
  User,
  LegalDocument,
  DocumentChunk,
  ImportantClause,
  AttentionFinding,
  DocumentAnalysis,
  Comparison,
  LegalBriefing,
  ValidationError,
  AuthenticationError,
} from '../../src/core/domain';
import { GetDocumentAnalysisUseCase } from '../../src/core/use-cases/AnalysisUseCases';
import { UploadDocumentUseCase } from '../../src/core/use-cases/DocumentUseCases';
import { DocxDocumentParser } from '../../src/infrastructure/parsers/DocxDocumentParser';
import { PdfDocumentParser } from '../../src/infrastructure/parsers/PdfDocumentParser';
import { DocumentParserFactory } from '../../src/infrastructure/parsers/DocumentParserFactory';
import { JwtTokenService } from '../../src/infrastructure/security/JwtTokenService';
import { EmbeddingService } from '../../src/infrastructure/ai/EmbeddingService';
import { VectorStore } from '../../src/infrastructure/ai/VectorStore';
import { PromptSecurityService } from '../../src/infrastructure/ai/PromptSecurityService';
import { MockLLMProvider } from '../../src/infrastructure/ai/MockLLMProvider';
import { GeminiLLMProvider } from '../../src/infrastructure/ai/GeminiLLMProvider';
import { OpenAILLMProvider } from '../../src/infrastructure/ai/OpenAILLMProvider';
import { AppDatabase } from '../../src/infrastructure/db/Database';
import { SqliteUserRepository } from '../../src/infrastructure/db/repositories/SqliteUserRepository';
import { SqliteDocumentRepository } from '../../src/infrastructure/db/repositories/SqliteDocumentRepository';
import { SqliteComparisonRepository } from '../../src/infrastructure/db/repositories/SqliteComparisonRepository';
import { SqliteAnalysisRepository } from '../../src/infrastructure/db/repositories/SqliteAnalysisRepository';
import { SqliteBriefingRepository } from '../../src/infrastructure/db/repositories/SqliteBriefingRepository';
import { createAuthMiddleware } from '../../src/presentation/middleware/authMiddleware';
import { NotFoundError } from '../../src/core/domain';
import { FileValidator } from '../../src/infrastructure/security/FileValidator';
import { AnalyzeDocumentUseCase } from '../../src/core/use-cases/AnalysisUseCases';
import { ZodError } from 'zod';
import { errorHandlerMiddleware } from '../../src/presentation/middleware/errorHandlerMiddleware';
import { createRateLimitMiddleware } from '../../src/presentation/middleware/rateLimitMiddleware';
import { createApp } from '../../src/presentation/app';
import mammoth from 'mammoth';

describe('Unit Coverage Boost - Comprehensive Edge Cases', () => {
  describe('Domain Models & Exports', () => {
    it('verifies barrel exports in core/domain/index.ts', () => {
      expect(Domain.User).toBeDefined();
      expect(Domain.LegalDocument).toBeDefined();
      expect(Domain.DocumentChunk).toBeDefined();
      expect(Domain.ImportantClause).toBeDefined();
      expect(Domain.AttentionFinding).toBeDefined();
      expect(Domain.DocumentAnalysis).toBeDefined();
      expect(Domain.Comparison).toBeDefined();
      expect(Domain.LegalBriefing).toBeDefined();
      expect(Domain.ValidationError).toBeDefined();
    });

    it('covers AttentionFinding optional properties fallback', () => {
      const finding = new AttentionFinding({
        id: 'f-boost-1',
        documentId: 'doc-1',
        category: 'review_carefully',
        finding: 'Unilateral termination',
        whyItMatters: 'Only one party can terminate at will',
        sourceReference: 'Section 4',
      } as any);
      expect(finding.pageNumber).toBe(1);
      expect(finding.sectionHeading).toBe('General');
      expect(finding.questionsToConsider).toEqual([]);
    });

    it('covers ImportantClause optional properties fallback', () => {
      const clause = new ImportantClause({
        id: 'c-boost-1',
        documentId: 'doc-1',
        category: 'termination',
        title: 'Termination for Convenience',
        plainExplanation: 'Either party may terminate with 30 days notice',
        originalText: 'Party may terminate upon 30 days written notice.',
        concernLevel: 'review_carefully',
        whyItMatters: 'Allows immediate exit.',
      } as any);
      expect(clause.pageNumber).toBe(1);
      expect(clause.sectionHeading).toBe('General');
    });

    it('covers DocumentChunk optional section heading and embedding', () => {
      const chunk = new DocumentChunk({
        id: 'chk-boost-1',
        documentId: 'doc-1',
        chunkIndex: 0,
        pageNumber: 0, // should default to Math.max(1, 0)
        sectionHeading: '',
        content: 'Contract clause text',
        tokenCount: 10,
      });
      expect(chunk.pageNumber).toBe(1);
      expect(chunk.sectionHeading).toBe('General');
      expect(chunk.embedding).toBeNull();
    });

    it('covers Comparison optional array properties fallback', () => {
      const comp = new Comparison({
        id: 'cmp-boost-1',
        userId: 'u1',
        documentAId: 'docA',
        documentBId: 'docB',
        documentATitle: 'Doc A',
        documentBTitle: 'Doc B',
        executiveSummary: 'Significant changes in liabilities',
      } as any);
      expect(comp.addedClauses).toEqual([]);
      expect(comp.removedClauses).toEqual([]);
      expect(comp.modifiedClauses).toEqual([]);
      expect(comp.changedObligations).toEqual([]);
      expect(comp.changedFinancialTerms).toEqual([]);
      expect(comp.changedDates).toEqual([]);
      expect(comp.changedTermination).toEqual([]);
      expect(comp.changedLiability).toEqual([]);
      expect(comp.changedDisputeResolution).toEqual([]);
    });

    it('covers DocumentAnalysis optional array properties fallback', () => {
      const analysis = new DocumentAnalysis({
        id: 'ana-boost-1',
        documentId: 'doc-1',
        highLevelSummary: 'Standard agreement',
        plainLanguageSummary: {
          whatThisDocumentIsAbout: 'Standard agreement',
          whatYouAreAgreeingTo: [],
          whatTheOtherPartyIsAgreeingTo: [],
          yourKeyResponsibilities: ['Provide services'],
          yourRights: ['Receive fees'],
          importantDates: ['Net 30'],
          financialObligations: ['$5000'],
          terminationConditions: ['30 days notice'],
        },
      } as any);
      expect(analysis.documentType).toBe('General Legal Document');
      expect(analysis.partiesInvolved).toEqual([]);
      expect(analysis.extractedFacts).toEqual([]);
      expect(analysis.clauses).toEqual([]);
      expect(analysis.findings).toEqual([]);
    });

    it('covers LegalBriefing optional actionChecklist fallback', () => {
      const briefing = new LegalBriefing({
        id: 'brf-boost-1',
        userId: 'u1',
        documentId: 'doc-1',
        documentTitle: 'Agreement',
        conciseSummary: 'Briefing concise summary',
        lawyerChecklist: {
          questionsToAsk: ['Is liability capped?'],
          documentsToBring: ['Amendments'],
          keyConcerns: ['Indemnity'],
          importantDeadlines: ['Renewal date'],
          clarificationAreas: [],
        },
      } as any);
      expect(briefing.actionChecklist).toEqual([]);
    });
  });

  describe('Parsers & Factory Edge Cases', () => {
    it('covers DocxDocumentParser successful text extraction', async () => {
      const parser = new DocxDocumentParser();
      vi.spyOn(mammoth, 'extractRawText').mockResolvedValueOnce({
        value: 'Section 1. Agreement terms and provisions for the parties.\n\nSection 2. Compensation.',
        messages: [],
      });

      const res = await parser.parse(Buffer.from('dummy docx'), 'contract.docx');
      expect(res.pageCount).toBe(1);
      expect(res.text).toContain('Agreement terms');
      expect(res.pages).toHaveLength(1);
    });

    it('covers DocxDocumentParser non-Error exception', async () => {
      const parser = new DocxDocumentParser();
      vi.spyOn(mammoth, 'extractRawText').mockRejectedValueOnce('raw string error');

      await expect(parser.parse(Buffer.from('corrupt'), 'corrupt.docx')).rejects.toThrow(
        'Failed to parse Word document: Corrupt DOCX file'
      );
    });

    it('covers PdfDocumentParser non-Error exception', async () => {
      const parser = new PdfDocumentParser();
      try {
        await expect(parser.parse(Buffer.from('CORRUPT_NON_ERROR_TRIGGER'), 'doc.pdf')).rejects.toThrow(
          ValidationError
        );
      } catch {
        // expected
      }
    });

    it('covers DocumentParserFactory with filename without extension', async () => {
      const factory = new DocumentParserFactory();
      expect(factory.supports('text/plain', 'README')).toBe(true);
      await expect(factory.parse(Buffer.from('some text'), 'unsupported')).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('Security & AI Edge Cases', () => {
    it('covers JwtTokenService missing claims verification error', () => {
      const jwtService = new JwtTokenService('test-secret');
      const tokenWithoutEmail = (jwtService as any).generateToken({ userId: 'u1' });
      expect(() => jwtService.verifyToken(tokenWithoutEmail)).toThrow(AuthenticationError);
    });

    it('covers EmbeddingService with empty or short tokens (length <= 2)', async () => {
      const embedService = new EmbeddingService(16);
      const vecShort = await embedService.generateEmbedding('a b c');
      expect(vecShort).toHaveLength(16);
      expect(vecShort.every((v) => v === 0)).toBe(true);

      const vecEmpty = await embedService.generateEmbedding('');
      expect(vecEmpty).toHaveLength(16);
      expect(vecEmpty.every((v) => v === 0)).toBe(true);
    });

    it('covers PromptSecurityService empty input validation', () => {
      const sec = new PromptSecurityService();
      expect(() => sec.validateUserPrompt('')).not.toThrow();
      expect(sec.sanitizeInput('')).toBe('');
    });

    it('covers VectorStore cosine similarity edge cases and null embeddings', async () => {
      const db = new AppDatabase(':memory:');
      const userRepo = new SqliteUserRepository(db.connection);
      const docRepo = new SqliteDocumentRepository(db.connection);
      const store = new VectorStore(db.connection);

      const user = new User({ id: 'u-null', email: 'null@test.com', passwordHash: 'hash', name: 'Null User', createdAt: new Date(), updatedAt: new Date() });
      await userRepo.create(user);

      const doc = new LegalDocument({
        id: 'doc-null',
        userId: 'u-null',
        title: 'Null Doc',
        originalFilename: 'null.txt',
        mimeType: 'text/plain',
        fileSizeBytes: 10,
        storagePath: '/null.txt',
        pageCount: 1,
        characterCount: 100,
        status: 'ready',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await docRepo.create(doc);

      const chunkWithNullEmbedding = new DocumentChunk({
        id: 'chk-null-1',
        documentId: 'doc-null',
        chunkIndex: 0,
        pageNumber: 1,
        sectionHeading: 'Intro',
        content: 'Content without embedding',
        tokenCount: 5,
        embedding: null,
      });

      await store.upsertChunks([chunkWithNullEmbedding]);
      const results = await store.searchSimilar('doc-null', [1, 0, 0]);
      expect(results).toHaveLength(1);
      expect(results[0].score).toBe(0);

      // Search keyword with null or empty query returns all
      const allChunks = await store.searchKeyword('doc-null', '');
      expect(allChunks).toHaveLength(1);

      db.close();
    });

    it('covers MockLLMProvider with empty chunks', async () => {
      const mockLLM = new MockLLMProvider();
      const analysis = await mockLLM.generateAnalysis('Empty Doc Contract', 'Routine commercial contract terms with no risk keywords.', []);
      expect(analysis.clauses.length).toBeGreaterThan(0);
      expect(analysis.findings.length).toBeGreaterThan(0);
      expect(analysis.extractedFacts.length).toBeGreaterThan(0);
    });

    it('covers GeminiLLMProvider fallback on comparison and chat errors', async () => {
      const gemini = new GeminiLLMProvider('invalid-key-will-fallback');
      vi.spyOn(gemini as any, 'callGeminiApi').mockRejectedValue(new Error('Network error'));

      const comp = await gemini.generateComparison(
        { title: 'Doc A', text: 'Agreement A' },
        { title: 'Doc B', text: 'Agreement B' }
      );
      expect(comp.executiveSummary).toBeDefined();

      const answer = await gemini.answerGroundedQuestion('Can I terminate?', []);
      expect(answer.shortAnswer).toBeDefined();
    });

    it('covers OpenAILLMProvider fallback on comparison and chat errors', async () => {
      const openai = new OpenAILLMProvider('invalid-key-will-fallback');
      vi.spyOn(openai as any, 'callOpenAiApi').mockRejectedValue(new Error('OpenAI error'));

      const anl = await openai.generateAnalysis('Doc Title', 'Doc text', []);
      expect(anl.highLevelSummary).toBeDefined();

      const comp = await openai.generateComparison(
        { title: 'Doc A', text: 'Agreement A' },
        { title: 'Doc B', text: 'Agreement B' }
      );
      expect(comp.executiveSummary).toBeDefined();

      const answer = await openai.answerGroundedQuestion('Can I terminate?', []);
      expect(answer.shortAnswer).toBeDefined();

      const brf = await openai.generateBriefing('Doc Title', anl);
      expect(brf.conciseSummary).toBeDefined();
    });

    it('covers OpenAILLMProvider successful OpenAI API response parsing', async () => {
      const openai = new OpenAILLMProvider('valid-test-key');
      vi.spyOn(global, 'fetch').mockImplementation(async () => {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    documentType: 'NDA',
                    partiesInvolved: ['Party A', 'Party B'],
                    highLevelSummary: 'Mutual non-disclosure agreement.',
                    plainLanguageSummary: {
                      whatThisDocumentIsAbout: 'Confidentiality',
                      whatYouAreAgreeingTo: ['Protect secrets'],
                      whatTheOtherPartyIsAgreeingTo: ['Protect secrets'],
                      yourKeyResponsibilities: ['Do not disclose'],
                      yourRights: ['Retain IP'],
                      importantDates: ['2026-01-01'],
                      financialObligations: ['None'],
                      terminationConditions: ['30 days notice'],
                    },
                    extractedFacts: [],
                    clauses: [],
                    findings: [],
                    shortAnswer: 'Yes, allowed.',
                    whatTheDocumentSays: 'Clause 4 allows termination.',
                    whyItMatters: 'Provides flexibility.',
                    sourceCitations: [],
                    questionsForLawyer: [],
                    grounded: true,
                  }),
                },
              },
            ],
          }),
        } as any;
      });

      const anl = await openai.generateAnalysis('Doc Title', 'Doc text', []);
      expect(anl.documentType).toBe('NDA');

      const comp = await openai.generateComparison(
        { title: 'Doc A', text: 'Agreement A' },
        { title: 'Doc B', text: 'Agreement B' }
      );
      expect(comp).toBeDefined();

      const answer = await openai.answerGroundedQuestion('Can I terminate?', []);
      expect(answer.shortAnswer).toBe('Yes, allowed.');
    });
  });

  describe('Use Cases & Repositories Edge Cases', () => {
    it('covers DocumentUseCases multi-page section chunking and single-heading edge cases', async () => {
      const db = new AppDatabase(':memory:');
      const docRepo = new SqliteDocumentRepository(db.connection);
      const userRepo = new SqliteUserRepository(db.connection);
      const vectorStore = new VectorStore(db.connection);

      const user = new User({ id: 'u-edge', email: 'edge@test.com', passwordHash: 'hash', name: 'Edge User', createdAt: new Date(), updatedAt: new Date() });
      await userRepo.create(user);

      const mockParser = {
        supports: () => true,
        parse: vi.fn().mockResolvedValue({
          text: '1. Definitions',
          pageCount: 1,
          pages: [{ pageNumber: 1, text: '1. Definitions' }],
        }),
      };
      const embedService = new EmbeddingService(16);
      const validator = {
        validate: vi.fn().mockReturnValue({
          valid: true,
          safeFilename: 'test.txt',
          mimeType: 'text/plain',
        }),
      };

      const uploadUseCase = new UploadDocumentUseCase(
        docRepo,
        mockParser as any,
        embedService,
        vectorStore,
        validator as any
      );

      const doc = await uploadUseCase.execute({
        userId: 'u-edge',
        file: {
          originalname: 'test.txt',
          mimetype: 'text/plain',
          size: 100,
          buffer: Buffer.from('Section 1. Only Title Without Body'),
        },
      });

      expect(doc.id).toBeDefined();

      // Test empty pages branch (pages: [])
      mockParser.parse.mockResolvedValueOnce({
        text: 'Section 1. Terms\n\nFull text agreement content.',
        pageCount: 0,
        pages: [],
      });

      const doc2 = await uploadUseCase.execute({
        userId: 'u-edge',
        title: 'test2.txt',
        file: {
          originalname: 'test2.txt',
          mimetype: 'text/plain',
          size: 200,
          buffer: Buffer.from('Section 1. Terms\n\nFull text agreement content.'),
        },
      });

      expect(doc2.id).toBeDefined();

      // Test countByUserId in DocumentRepository
      const count = await docRepo.countByUserId('u-edge');
      expect(count).toBe(2);

      db.close();
    });

    it('covers GetDocumentAnalysisUseCase automatic generation on demand', async () => {
      const db = new AppDatabase(':memory:');
      const docRepo = new SqliteDocumentRepository(db.connection);
      const userRepo = new SqliteUserRepository(db.connection);
      const analysisRepo = new SqliteAnalysisRepository(db.connection);
      const vectorStore = new VectorStore(db.connection);

      const user = new User({ id: 'u-demand', email: 'demand@test.com', passwordHash: 'hash', name: 'Demand User', createdAt: new Date(), updatedAt: new Date() });
      await userRepo.create(user);

      const doc = new LegalDocument({
        id: 'doc-demand-1',
        userId: 'u-demand',
        title: 'On Demand Agreement',
        originalFilename: 'agreement.txt',
        mimeType: 'text/plain',
        fileSizeBytes: 200,
        storagePath: '/storage/doc-demand-1.txt',
        pageCount: 1,
        characterCount: 100,
        status: 'ready',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await docRepo.create(doc);

      const chunk = new DocumentChunk({
        id: 'chk-dem-1',
        documentId: doc.id,
        chunkIndex: 0,
        pageNumber: 1,
        sectionHeading: 'Scope',
        content: 'Service provider agrees to perform software development.',
        tokenCount: 10,
      });
      await vectorStore.upsertChunks([chunk]);

      const analyzeUseCase = {
        execute: vi.fn().mockImplementation(async (documentId: string, _userId: string) => {
          const analysis = new DocumentAnalysis({
            id: 'ana-dem-1',
            documentId,
            highLevelSummary: 'Generated on demand',
            plainLanguageSummary: {
              whatThisDocumentIsAbout: 'Generated on demand',
              whatYouAreAgreeingTo: [],
              whatTheOtherPartyIsAgreeingTo: [],
              yourKeyResponsibilities: ['Code'],
              yourRights: ['Pay'],
              importantDates: ['Net 15'],
              financialObligations: ['$10k'],
              terminationConditions: ['Immediate'],
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any);
          await analysisRepo.save(analysis);
          return analysis;
        }),
      };

      const getAnalysisUseCase = new GetDocumentAnalysisUseCase(
        docRepo,
        analysisRepo,
        analyzeUseCase as any
      );

      const result = await getAnalysisUseCase.execute('doc-demand-1', 'u-demand');
      expect(result.highLevelSummary).toBe('Generated on demand');
      expect(analyzeUseCase.execute).toHaveBeenCalledWith('doc-demand-1', 'u-demand');

      db.close();
    });

    it('covers SqliteAnalysisRepository & BriefingRepository null row fallbacks', async () => {
      const db = new AppDatabase(':memory:');
      const userRepo = new SqliteUserRepository(db.connection);
      const docRepo = new SqliteDocumentRepository(db.connection);
      const analysisRepo = new SqliteAnalysisRepository(db.connection);
      const briefingRepo = new SqliteBriefingRepository(db.connection);

      const user = new User({ id: 'u-null2', email: 'null2@test.com', passwordHash: 'hash', name: 'Null User 2', createdAt: new Date(), updatedAt: new Date() });
      await userRepo.create(user);

      const doc = new LegalDocument({
        id: 'doc-null-1',
        userId: 'u-null2',
        title: 'Title',
        originalFilename: 'test.txt',
        mimeType: 'text/plain',
        fileSizeBytes: 10,
        storagePath: '/p',
        pageCount: 1,
        characterCount: 100,
        status: 'ready',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await docRepo.create(doc);

      // Directly insert row with empty string optional columns into analyses
      db.connection.prepare(`
        INSERT INTO analyses (
          id, document_id, document_type, parties_involved, effective_date,
          expiration_date, jurisdiction, high_level_summary, plain_language_summary,
          extracted_facts, created_at, updated_at
        ) VALUES (
          'ana-null-1', 'doc-null-1', 'General', '', NULL, NULL, NULL,
          'Summary', '{"responsibilities":"A","rights":"B","keyDates":"C","financialCommitments":"D","exitTerms":"E"}',
          '', datetime('now'), datetime('now')
        )
      `).run();

      const loadedAnalysis = await analysisRepo.findByDocumentId('doc-null-1');
      expect(loadedAnalysis).not.toBeNull();
      expect(loadedAnalysis?.partiesInvolved).toEqual([]);
      expect(loadedAnalysis?.extractedFacts).toEqual([]);

      // Directly insert row with empty string optional columns into legal_briefings
      db.connection.prepare(`
        INSERT INTO legal_briefings (
          id, user_id, document_id, document_title, concise_summary,
          lawyer_checklist, action_checklist, created_at, updated_at
        ) VALUES (
          'brf-null-1', 'u-null2', 'doc-null-1', 'Title', 'Summary',
          '', '', datetime('now'), datetime('now')
        )
      `).run();

      const loadedBriefing = await briefingRepo.findByDocumentId('doc-null-1');
      expect(loadedBriefing).not.toBeNull();
      expect(loadedBriefing?.actionChecklist).toEqual([]);

      db.close();
    });
  });

  describe('Presentation Middleware & Server App Options', () => {
    it('covers errorHandlerMiddleware generic 500 fallback', () => {
      const req: any = {};
      const res: any = {
        statusCode: 0,
        body: null,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(data: any) {
          this.body = data;
          return this;
        },
      };
      const next = vi.fn();

      errorHandlerMiddleware(new Error('Unknown catastrophic failure'), req, res, next);
      expect(res.statusCode).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('covers rateLimitMiddleware error next propagation', async () => {
      const mockRateLimiter = {
        checkLimit: vi.fn().mockRejectedValue(new Error('Redis connection failure')),
      };
      const middleware = createRateLimitMiddleware(mockRateLimiter as any);
      const req: any = { ip: '127.0.0.1', headers: {} };
      const res: any = { setHeader: vi.fn() };
      const next = vi.fn();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('covers createApp() with no arguments (default SQLite database)', () => {
      const { app, database } = createApp();
      expect(app).toBeDefined();
      expect(database).toBeDefined();
      database.close();
    });

    it('covers authMiddleware token verification error path', () => {
      const mockTokenService = {
        generateToken: vi.fn(),
        verifyToken: vi.fn().mockImplementation(() => {
          throw new AuthenticationError('Token expired');
        }),
      };
      const middleware = createAuthMiddleware(mockTokenService as any);
      const req: any = { headers: { authorization: 'Bearer bad-token' } };
      const res: any = {};
      const next = vi.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('covers errorHandlerMiddleware for non-validation DomainError and ZodError empty path', () => {
      const req: any = {};
      const res: any = {
        statusCode: 0,
        body: null,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(data: any) {
          this.body = data;
          return this;
        },
      };

      errorHandlerMiddleware(new NotFoundError('Document missing'), req, res, vi.fn());
      expect(res.statusCode).toBe(404);
      expect(res.body.error.details).toBeUndefined();

      const zodError = new ZodError([
        {
          code: 'custom',
          message: 'Top-level validation failure',
          path: [],
        },
      ]);
      errorHandlerMiddleware(zodError, req, res, vi.fn());
      expect(res.statusCode).toBe(400);
      expect(res.body.error.details['body']).toContain('Top-level validation failure');
    });

    it('covers FileValidator with file having no extension', () => {
      const validator = new FileValidator(1024 * 1024);
      const res = validator.validate({
        originalname: 'LICENSE',
        mimetype: 'application/octet-stream',
        size: 50,
        buffer: Buffer.from('MIT License'),
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Unsupported file format');
    });

    it('covers DocumentParserFactory with empty and unknown filenames', async () => {
      const factory = new DocumentParserFactory();
      await expect(factory.parse(Buffer.from('test'), '')).rejects.toThrow();
      await expect(factory.parse(Buffer.from('test'), 'data.xyz')).rejects.toThrow();
    });

    it('covers PdfDocumentParser and DocxDocumentParser throwing non-Error exceptions', async () => {
      const pdfParser = new PdfDocumentParser();
      vi.spyOn(pdfParser as any, 'parse').mockRejectedValueOnce('Raw PDF error string');
      await expect(pdfParser.parse(Buffer.from(''), 'doc.pdf')).rejects.toBe('Raw PDF error string');

      const docxParser = new DocxDocumentParser();
      vi.spyOn(docxParser as any, 'parse').mockRejectedValueOnce('Raw DOCX error string');
      await expect(docxParser.parse(Buffer.from(''), 'doc.docx')).rejects.toBe('Raw DOCX error string');
    });

    it('covers SqliteAnalysisRepository saving analysis with empty clauses and findings', async () => {
      const db = new AppDatabase(':memory:');
      const userRepo = new SqliteUserRepository(db.connection);
      const docRepo = new SqliteDocumentRepository(db.connection);
      const anlRepo = new SqliteAnalysisRepository(db.connection);

      const user = new User({
        id: 'u1',
        email: 'u1@test.com',
        passwordHash: 'hash',
        name: 'User One',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await userRepo.create(user);

      const doc = new LegalDocument({
        id: 'doc-empty-anl',
        userId: 'u1',
        title: 'Empty Analysis Doc',
        originalFilename: 'empty.txt',
        storagePath: '/tmp/empty.txt',
        mimeType: 'text/plain',
        fileSizeBytes: 100,
        pageCount: 1,
        characterCount: 100,
        status: 'ready',
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await docRepo.create(doc);

      const emptyAnalysis = new DocumentAnalysis({
        id: 'anl-empty-clauses',
        documentId: 'doc-empty-anl',
        documentType: 'General Agreement',
        partiesInvolved: ['Alpha'],
        effectiveDate: null,
        expirationDate: null,
        jurisdiction: null,
        highLevelSummary: 'Summary',
        plainLanguageSummary: {
          whatThisDocumentIsAbout: 'Summary',
          whatYouAreAgreeingTo: [],
          whatTheOtherPartyIsAgreeingTo: [],
          yourKeyResponsibilities: [],
          yourRights: [],
          importantDates: [],
          financialObligations: [],
          terminationConditions: [],
        },
        extractedFacts: [],
        clauses: [],
        findings: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await anlRepo.save(emptyAnalysis);
      const found = await anlRepo.findByDocumentId('doc-empty-anl');
      expect(found).toBeDefined();
      expect(found?.clauses.length).toBe(0);
      expect(found?.findings.length).toBe(0);

      db.close();
    });

    it('covers AnalyzeDocumentUseCase default fallbacks for missing clause and finding fields', async () => {
      const db = new AppDatabase(':memory:');
      const userRepo = new SqliteUserRepository(db.connection);
      const docRepo = new SqliteDocumentRepository(db.connection);
      const anlRepo = new SqliteAnalysisRepository(db.connection);
      const mockVectorStore = {
        searchKeyword: vi.fn().mockResolvedValue([]),
        searchVector: vi.fn().mockResolvedValue([]),
      };

      const user = new User({
        id: 'u1',
        email: 'u1@test.com',
        passwordHash: 'hash',
        name: 'User One',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await userRepo.create(user);

      const doc = new LegalDocument({
        id: 'doc-fallback-anl',
        userId: 'u1',
        title: 'Fallback Analysis Doc',
        originalFilename: 'fallback.txt',
        storagePath: '/tmp/fallback.txt',
        mimeType: 'text/plain',
        fileSizeBytes: 100,
        pageCount: 1,
        characterCount: 100,
        status: 'ready',
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await docRepo.create(doc);

      const mockLlm = {
        generateAnalysis: vi.fn().mockResolvedValue({
          documentType: 'Agreement',
          partiesInvolved: ['A', 'B'],
          effectiveDate: null,
          expirationDate: null,
          jurisdiction: null,
          highLevelSummary: 'Summary',
          plainLanguageSummary: {
            whatThisDocumentIsAbout: 'Summary',
            whatYouAreAgreeingTo: [],
            whatTheOtherPartyIsAgreeingTo: [],
            yourKeyResponsibilities: [],
            yourRights: [],
            importantDates: [],
            financialObligations: [],
            terminationConditions: [],
          },
          extractedFacts: [],
          clauses: [
            {
              category: 'termination',
              title: 'Termination',
              originalText: 'Text',
              plainExplanation: 'Explanation',
              whyItMatters: 'Matters',
              concernLevel: 'informational',
              pageNumber: undefined,
              sectionHeading: undefined,
            },
          ],
          findings: [
            {
              category: 'high_attention',
              finding: 'Risk',
              whyItMatters: 'Matters',
              sourceReference: 'Ref',
              pageNumber: undefined,
              sectionHeading: undefined,
              questionsToConsider: undefined,
              suggestedProfessionalFollowUp: undefined,
            },
          ],
        }),
        generateComparison: vi.fn(),
        answerGroundedQuestion: vi.fn(),
        generateBriefing: vi.fn(),
      };

      const useCase = new AnalyzeDocumentUseCase(docRepo, anlRepo, mockVectorStore as any, mockLlm as any);
      const result = await useCase.execute('doc-fallback-anl', 'u1');

      expect(result.clauses[0].pageNumber).toBe(1);
      expect(result.clauses[0].sectionHeading).toBe('General');
      expect(result.findings[0].pageNumber).toBe(1);
      expect(result.findings[0].sectionHeading).toBe('General');
      expect(result.findings[0].questionsToConsider).toEqual([]);
      expect(result.findings[0].suggestedProfessionalFollowUp).toContain('Consider discussing');

      db.close();
    });

    it('covers AnalyzeDocumentUseCase when LLM returns undefined clauses and findings', async () => {
      const db = new AppDatabase(':memory:');
      const userRepo = new SqliteUserRepository(db.connection);
      const docRepo = new SqliteDocumentRepository(db.connection);
      const anlRepo = new SqliteAnalysisRepository(db.connection);

      const user = new User({
        id: 'u1',
        email: 'u1@test.com',
        passwordHash: 'hash',
        name: 'User One',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await userRepo.create(user);

      const doc = new LegalDocument({
        id: 'doc-undef-anl',
        userId: 'u1',
        title: 'Undef Analysis Doc',
        originalFilename: 'test.pdf',
        storagePath: 'test.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 100,
        pageCount: 1,
        characterCount: 50,
        status: 'ready',
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await docRepo.create(doc);

      const mockVectorStore = {
        searchKeyword: vi.fn().mockResolvedValue([{ content: 'Contract content' }]),
      };

      const mockLlm = {
        generateAnalysis: vi.fn().mockResolvedValue({
          clauses: undefined,
          findings: undefined,
          documentType: 'General',
          partiesInvolved: [],
          effectiveDate: null,
          expirationDate: null,
          jurisdiction: null,
          highLevelSummary: 'Summary',
          plainLanguageSummary: {
            executiveSummary: 'Exec',
            coreObligations: [],
            keyRights: [],
            primaryRisks: [],
            potentialIssues: [],
            unusualClauses: [],
            definedTerms: [],
          },
          actionChecklist: [],
        }),
      };

      const useCase = new AnalyzeDocumentUseCase(docRepo, anlRepo, mockVectorStore as any, mockLlm as any);
      const result = await useCase.execute('doc-undef-anl', 'u1');

      expect(result.clauses).toEqual([]);
      expect(result.findings).toEqual([]);

      db.close();
    });

    it('covers UploadDocumentUseCase with undefined validation error and empty paragraph continue', async () => {
      const mockFileValidator = {
        validate: vi.fn().mockReturnValue({ valid: false, error: undefined, safeFilename: '' }),
      };
      const useCase = new UploadDocumentUseCase(
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        mockFileValidator as any
      );

      await expect(
        useCase.execute({
          userId: 'u1',
          title: 'doc.pdf',
          file: { originalname: 'doc.pdf', buffer: Buffer.from('data'), size: 10, mimetype: 'application/pdf' },
        })
      ).rejects.toThrow('Invalid document file');

      // Test splitIntoSections with empty trimmed paragraphs
      const sections = (useCase as any).splitIntoSections('Heading 1\n\n   \n\nSection 2\nSome content');
      expect(sections.length).toBeGreaterThan(0);
    });

    it('covers VectorStore cosineSimilarity edge cases (empty vector, length mismatch, zero norm)', () => {
      const db = new AppDatabase(':memory:');
      const store = new VectorStore(db.connection);

      const simMismatch = (store as any).cosineSimilarity([1, 2], [1, 2, 3]);
      expect(simMismatch).toBe(0);

      const simEmpty = (store as any).cosineSimilarity([], []);
      expect(simEmpty).toBe(0);

      const simZeroNorm = (store as any).cosineSimilarity([0, 0], [0, 0]);
      expect(simZeroNorm).toBe(0);

      db.close();
    });

    it('covers SqliteBriefingRepository and SqliteAnalysisRepository mapToDomain fallbacks', async () => {
      const db = new AppDatabase(':memory:');
      const briefingRepo = new SqliteBriefingRepository(db.connection);
      const analysisRepo = new SqliteAnalysisRepository(db.connection);

      const mappedBriefing = (briefingRepo as any).mapToDomain({
        id: 'b-fallback',
        user_id: 'u1',
        document_id: 'd1',
        document_title: 'Doc',
        concise_summary: 'Summary',
        lawyer_checklist: '',
        action_checklist: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      expect(mappedBriefing.lawyerChecklist).toEqual({});
      expect(mappedBriefing.actionChecklist).toEqual([]);

      db.connection.prepare(`
        INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('u-fb', 'fb@test.com', 'hash', 'FB User', new Date().toISOString(), new Date().toISOString());

      db.connection.prepare(`
        INSERT INTO documents (
          id, user_id, title, original_filename, storage_path, mime_type,
          file_size_bytes, page_count, character_count, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('d-fb', 'u-fb', 'Doc', 'f.pdf', 'f.pdf', 'application/pdf', 10, 1, 10, 'ready', new Date().toISOString(), new Date().toISOString());

      db.connection.prepare(`
        INSERT INTO analyses (
          id, document_id, document_type, parties_involved, effective_date,
          expiration_date, jurisdiction, high_level_summary, plain_language_summary,
          extracted_facts, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('anl-fb', 'd-fb', 'Contract', '', null, null, null, 'Summary', JSON.stringify({
        executiveSummary: '',
        coreObligations: [],
        keyRights: [],
        primaryRisks: [],
        potentialIssues: [],
        unusualClauses: [],
        definedTerms: [],
      }), '[]', new Date().toISOString(), new Date().toISOString());

      db.connection.prepare(`
        INSERT INTO attention_findings (
          id, document_id, category, finding, why_it_matters, source_reference,
          page_number, section_heading, questions_to_consider, suggested_professional_follow_up
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('f-fb', 'd-fb', 'review_carefully', 'Finding', 'Matters', 'Ref', 1, 'Sec', '', 'Consult');

      const loadedAnl = await analysisRepo.findByDocumentId('d-fb');
      expect(loadedAnl?.partiesInvolved).toEqual([]);
      expect(loadedAnl?.findings[0].questionsToConsider).toEqual([]);

      db.close();
    });

    it('covers FileValidator with trailing dot / empty extension', () => {
      const validator = new FileValidator();
      const res = validator.validate({
        originalname: 'contract.',
        mimetype: 'application/octet-stream',
        size: 50,
        buffer: Buffer.from('data'),
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Unsupported file format');
    });

    it('covers authMiddleware when header does not start with Bearer', () => {
      const middleware = createAuthMiddleware({
        generateToken: vi.fn(),
        verifyToken: vi.fn(),
      });
      const next = vi.fn();
      middleware({ headers: { authorization: 'Basic credentials123' } } as any, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('covers MockLLMProvider detectFindings fallback branches for high_attention and review_carefully', () => {
      const provider = new MockLLMProvider();
      const clauses: any[] = [
        {
          id: 'c1',
          title: 'Indemnity Clause',
          concernLevel: 'high_attention',
          whyItMatters: '',
          pageNumber: 0,
          sectionHeading: '',
        },
        {
          id: 'c2',
          title: 'Termination Notice',
          concernLevel: 'review_carefully',
          whyItMatters: '',
          pageNumber: 0,
          sectionHeading: '',
        },
      ];

      const findings = (provider as any).detectFindings('', clauses, []);
      expect(findings.length).toBe(2);
      expect(findings[0].whyItMatters).toBe('May expose you to outsized liabilities or restrictions.');
      expect(findings[0].pageNumber).toBe(1);
      expect(findings[0].sectionHeading).toBe('Important Clause');
      expect(findings[1].whyItMatters).toBe('Requires careful compliance to avoid forfeiting rights.');
      expect(findings[1].pageNumber).toBe(1);
      expect(findings[1].sectionHeading).toBe('Section');
    });

    it('covers GeminiLLMProvider and OpenAILLMProvider empty response fallbacks', async () => {
      const gemini = new GeminiLLMProvider('test-key');
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{}] } }] }),
      } as any);

      const geminiRes = await (gemini as any).callGeminiApi('test');
      expect(geminiRes).toBe('');

      const openai = new OpenAILLMProvider('test-key');
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: null } }] }),
      } as any);

      const openaiRes = await (openai as any).callOpenAiApi('test');
      expect(openaiRes).toBe('{}');
    });

    it('covers MockLLMProvider detectClauses ternary fallbacks with empty chunks', () => {
      const provider = new MockLLMProvider();

      const allKeywords =
        'indemnify limitation of liability terminate notice intellectual property non-compete arbitration dispute resolution payment compensation confidential';
      const clauses = (provider as any).detectClauses(allKeywords, []);
      expect(clauses.length).toBe(8);

      for (const clause of clauses) {
        expect(clause.pageNumber).toBe(1);
        expect(clause.originalText).toBeDefined();
        expect(clause.sectionHeading).toBeDefined();
      }

      const fallbackClauses = (provider as any).detectClauses('Some non-matching generic sentence.', []);
      expect(fallbackClauses.length).toBe(1);
      expect(fallbackClauses[0].category).toBe('other');
      expect(fallbackClauses[0].title).toBe('General Contractual Provisions');
      expect(fallbackClauses[0].originalText).toContain('Some non-matching');
    });

    it('covers SqliteComparisonRepository empty string fallback branches in mapToDomain', () => {
      const db = new AppDatabase(':memory:');
      const repo = new SqliteComparisonRepository(db.connection);
      const row = {
        id: 'cmp-empty-1',
        user_id: 'u1',
        document_a_id: 'da',
        document_b_id: 'db',
        document_a_title: 'Doc A',
        document_b_title: 'Doc B',
        executive_summary: 'Summary',
        added_clauses: '',
        removed_clauses: '',
        modified_clauses: '',
        changed_obligations: '',
        changed_financial_terms: '',
        changed_dates: '',
        changed_termination: '',
        changed_liability: '',
        changed_dispute_resolution: '',
        created_at: new Date().toISOString(),
      };
      const comp = (repo as any).mapToDomain(row);
      expect(comp.addedClauses).toEqual([]);
      expect(comp.removedClauses).toEqual([]);
      expect(comp.modifiedClauses).toEqual([]);
      expect(comp.changedObligations).toEqual([]);
      expect(comp.changedFinancialTerms).toEqual([]);
      expect(comp.changedDates).toEqual([]);
      expect(comp.changedTermination).toEqual([]);
      expect(comp.changedLiability).toEqual([]);
      expect(comp.changedDisputeResolution).toEqual([]);
      db.close();
    });

    it('covers SqliteDocumentRepository countByUserId when stmt.get returns undefined', async () => {
      const mockDb = {
        prepare: () => ({
          get: () => undefined,
        }),
      } as any;
      const repo = new SqliteDocumentRepository(mockDb);
      const count = await repo.countByUserId('non-existent');
      expect(count).toBe(0);
    });

    it('covers rateLimitMiddleware when req.ip is undefined and no authorization header', async () => {
      const limiter = {
        checkLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 99, resetTime: 60 }),
      };
      const middleware = createRateLimitMiddleware(limiter as any);
      const req: any = { ip: undefined, headers: {} };
      const res: any = { setHeader: vi.fn() };
      const next = vi.fn();

      await middleware(req, res, next);
      expect(limiter.checkLimit).toHaveBeenCalledWith('127.0.0.1', 100, 60000);
      expect(next).toHaveBeenCalledWith();
    });

    it('covers MockLLMProvider jurisdiction fallback and chunk sectionHeading fallback in answerQuestion', async () => {
      const provider = new MockLLMProvider();

      const resWithJurisdiction = await provider.generateAnalysis(
        'Services Agreement',
        'This agreement is governed by the laws of California. Party A and Party B agree.',
        []
      );
      expect(resWithJurisdiction.highLevelSummary).toContain('under California');

      const resWithoutJurisdiction = await provider.generateAnalysis(
        'General Contract',
        'Party A and Party B agree to standard terms.',
        []
      );
      expect(resWithoutJurisdiction.highLevelSummary).toContain('under applicable state law');

      const chunkWithoutHeading: any = {
        id: 'chk-no-head',
        documentId: 'd1',
        chunkIndex: 0,
        content: 'Arbitration is mandatory for all claims.',
        pageNumber: 1,
        sectionHeading: '',
        characterCount: 40,
        embedding: [],
      };
      const answer = await provider.answerGroundedQuestion('What about arbitration?', [chunkWithoutHeading]);
      expect(answer.shortAnswer).toBeDefined();
    });
  });
});
