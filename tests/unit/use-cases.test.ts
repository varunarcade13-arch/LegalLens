import { describe, it, expect, beforeEach } from 'vitest';
import {
  RegisterUserUseCase,
  LoginUserUseCase,
  GetUserProfileUseCase,
  DeleteAccountUseCase,
  UploadDocumentUseCase,
  GetDocumentUseCase,
  ListDocumentsUseCase,
  DeleteDocumentUseCase,
  SearchDocumentUseCase,
  AnalyzeDocumentUseCase,
  GetDocumentAnalysisUseCase,
  CompareDocumentsUseCase,
  GetComparisonUseCase,
  ListComparisonsUseCase,
  AskDocumentChatUseCase,
  GetChatHistoryUseCase,
  ClearChatHistoryUseCase,
  GenerateLegalBriefingUseCase,
  GetLegalBriefingUseCase,
  UpdateActionChecklistUseCase,
  GetDashboardStatsUseCase,
  LoadDemoDocumentUseCase,
  DemoTemplate,
} from '../../src/core/use-cases';
import {
  ValidationError,
  ConflictError,
  AuthenticationError,
  NotFoundError,
  ForbiddenError,
} from '../../src/core/domain/Errors';
import { User } from '../../src/core/domain/User';
import { LegalDocument } from '../../src/core/domain/LegalDocument';
import { DocumentChunk } from '../../src/core/domain/DocumentChunk';
import { DocumentAnalysis } from '../../src/core/domain/DocumentAnalysis';
import { Comparison } from '../../src/core/domain/Comparison';
import { ChatMessage } from '../../src/core/domain/ChatMessage';
import { LegalBriefing } from '../../src/core/domain/LegalBriefing';
import { ImportantClause } from '../../src/core/domain/ImportantClause';
import { AttentionFinding } from '../../src/core/domain/AttentionFinding';
import {
  IUserRepository,
  IDocumentRepository,
  IAnalysisRepository,
  IComparisonRepository,
  IChatRepository,
  IBriefingRepository,
  IPasswordHasher,
  ITokenService,
  IVectorStore,
  IEmbeddingService,
  IDocumentParser,
  IFileValidator,
  ILLMProvider,
  VectorSearchResult,
} from '../../src/core/ports';

// In-Memory Mocks
class MockUserRepo implements IUserRepository {
  public users: Map<string, User> = new Map();
  async create(user: User) { this.users.set(user.id, user); }
  async findById(id: string) { return this.users.get(id) || null; }
  async findByEmail(email: string) {
    for (const u of this.users.values()) {
      if (u.email === email.toLowerCase().trim()) return u;
    }
    return null;
  }
  async update(user: User) { this.users.set(user.id, user); }
  async delete(id: string) { this.users.delete(id); }
}

class MockDocRepo implements IDocumentRepository {
  public docs: Map<string, LegalDocument> = new Map();
  async create(doc: LegalDocument) { this.docs.set(doc.id, doc); }
  async findById(id: string) { return this.docs.get(id) || null; }
  async findByUserId(userId: string) {
    return Array.from(this.docs.values()).filter((d) => d.userId === userId);
  }
  async update(doc: LegalDocument) { this.docs.set(doc.id, doc); }
  async delete(id: string) { this.docs.delete(id); }
  async countByUserId(userId: string) {
    return (await this.findByUserId(userId)).length;
  }
}

class MockAnalysisRepo implements IAnalysisRepository {
  public analyses: Map<string, DocumentAnalysis> = new Map();
  async save(analysis: DocumentAnalysis) { this.analyses.set(analysis.documentId, analysis); }
  async findByDocumentId(documentId: string) { return this.analyses.get(documentId) || null; }
  async deleteByDocumentId(documentId: string) { this.analyses.delete(documentId); }
}

class MockCompRepo implements IComparisonRepository {
  public comps: Map<string, Comparison> = new Map();
  async save(comp: Comparison) { this.comps.set(comp.id, comp); }
  async findById(id: string) { return this.comps.get(id) || null; }
  async findByUserId(userId: string) {
    return Array.from(this.comps.values()).filter((c) => c.userId === userId);
  }
  async delete(id: string) { this.comps.delete(id); }
}

class MockChatRepo implements IChatRepository {
  public messages: ChatMessage[] = [];
  async saveMessage(msg: ChatMessage) { this.messages.push(msg); }
  async getMessages(documentId: string, userId: string) {
    return this.messages.filter((m) => m.documentId === documentId && m.userId === userId);
  }
  async clearMessages(documentId: string, userId: string) {
    this.messages = this.messages.filter((m) => !(m.documentId === documentId && m.userId === userId));
  }
}

class MockBriefingRepo implements IBriefingRepository {
  public briefings: Map<string, LegalBriefing> = new Map();
  async save(b: LegalBriefing) { this.briefings.set(b.documentId, b); }
  async findByDocumentId(documentId: string) { return this.briefings.get(documentId) || null; }
  async update(b: LegalBriefing) { this.briefings.set(b.documentId, b); }
  async delete(documentId: string) { this.briefings.delete(documentId); }
}

class MockHasher implements IPasswordHasher {
  async hash(pw: string) { return `hashed_${pw}`; }
  async compare(pw: string, hash: string) { return `hashed_${pw}` === hash; }
}

class MockTokenSvc implements ITokenService {
  generateToken(p: { userId: string; email: string }) { return `tok_${p.userId}_${p.email}`; }
  verifyToken(t: string) {
    const parts = t.split('_');
    return { userId: parts[1] || 'u1', email: parts[2] || 'test@example.com' };
  }
}

class MockVecStore implements IVectorStore {
  public chunks: Map<string, DocumentChunk[]> = new Map();
  async upsertChunks(chunks: DocumentChunk[]) {
    if (chunks.length === 0) return;
    const docId = chunks[0].documentId;
    const existing = this.chunks.get(docId) || [];
    this.chunks.set(docId, [...existing, ...chunks]);
  }
  async searchSimilar(documentId: string, _queryVec: number[], topK: number = 4): Promise<VectorSearchResult[]> {
    const docChunks = this.chunks.get(documentId) || [];
    return docChunks.slice(0, topK).map((chunk) => ({ chunk, score: 0.9 }));
  }
  async searchKeyword(documentId: string, query: string): Promise<DocumentChunk[]> {
    const docChunks = this.chunks.get(documentId) || [];
    if (!query) return docChunks;
    return docChunks.filter((c) => c.content.toLowerCase().includes(query.toLowerCase()));
  }
  async deleteByDocumentId(documentId: string) { this.chunks.delete(documentId); }
  async invalidateIncompatibleEmbeddings(_expectedDimension: number) { return 0; }
}

class MockEmbedSvc implements IEmbeddingService {
  async generateEmbedding(_text: string, _taskType?: any) { return [0.1, 0.2]; }
  async generateEmbeddings(texts: string[], _taskType?: any) { return texts.map(() => [0.1, 0.2]); }
}

class MockDocParser implements IDocumentParser {
  supports() { return true; }
  async parse(buffer: Buffer, _fn: string) {
    const text = buffer.toString('utf-8');
    return {
      text,
      pageCount: 2,
      pages: [
        { pageNumber: 1, text: 'Section 1. Terms\n\nSection 2. Termination' },
        { pageNumber: 2, text: 'Section 3. Payment\n\nSection 4. Liability' },
      ],
    };
  }
}

class MockValidator implements IFileValidator {
  public shouldFail = false;
  validate(file: any) {
    if (this.shouldFail) return { valid: false, safeFilename: '', mimeType: '', error: 'File validation failed' };
    return { valid: true, safeFilename: file.originalname, mimeType: 'text/plain' };
  }
}

class MockLLM implements ILLMProvider {
  public name = 'MockLLM';
  async generateAnalysis(title: string, _text: string, _chunks: any[]) {
    return {
      documentType: 'Employment Agreement',
      partiesInvolved: ['Apex Inc', 'Jane Doe'],
      effectiveDate: '2025-01-01',
      expirationDate: null,
      jurisdiction: 'Delaware',
      highLevelSummary: `Summary of ${title}`,
      plainLanguageSummary: {
        whatThisDocumentIsAbout: 'Employment terms',
        whatYouAreAgreeingTo: ['Full time work'],
        whatTheOtherPartyIsAgreeingTo: ['Salary'],
        yourKeyResponsibilities: ['Software engineering'],
        yourRights: ['Paid leave'],
        importantDates: ['Jan 1'],
        financialObligations: ['None'],
        terminationConditions: ['30 days notice'],
      },
      extractedFacts: [{ category: 'Date', fact: 'Jan 1', verbatimExcerpt: '2025-01-01', pageNumber: 1 }],
      clauses: [
        new ImportantClause({
          id: 'c1',
          documentId: 'd1',
          category: 'termination' as any,
          title: 'Termination',
          originalText: 'Notice period 30 days',
          plainExplanation: 'You can leave with 30 days notice',
          whyItMatters: 'Notice required',
          concernLevel: 'review_carefully' as any,
          pageNumber: 1,
          sectionHeading: 'Termination',
        }),
      ],
      findings: [
        new AttentionFinding({
          id: 'f1',
          documentId: 'd1',
          category: 'review_carefully' as any,
          finding: 'Termination period',
          whyItMatters: 'Requires notice',
          sourceReference: 'Page 1, Termination',
          pageNumber: 1,
          sectionHeading: 'Termination',
          questionsToConsider: ['Can notice be waived?'],
          suggestedProfessionalFollowUp: 'Ask attorney',
        }),
      ],
    };
  }

  async generateComparison(docA: any, docB: any) {
    return {
      executiveSummary: `Diff between ${docA.title} and ${docB.title}`,
      addedClauses: [],
      removedClauses: [],
      modifiedClauses: [],
      changedObligations: [],
      changedFinancialTerms: [],
      changedDates: [],
      changedTermination: [],
      changedLiability: [],
      changedDisputeResolution: [],
    };
  }

  async answerGroundedQuestion(q: string, chunks: any[]) {
    return {
      shortAnswer: `Answer for ${q}`,
      whatTheDocumentSays: 'Document says XYZ',
      whyItMatters: 'Matters a lot',
      sourceCitations: chunks.map((c) => ({ chunkId: c.id, pageNumber: c.pageNumber, sectionHeading: c.sectionHeading, textSnippet: c.content })),
      questionsForLawyer: ['Ask about XYZ'],
      grounded: true,
    };
  }

  async generateBriefing(title: string, _analysis: any) {
    return {
      conciseSummary: `Briefing for ${title}`,
      lawyerChecklist: {
        questionsToAsk: ['Is this standard?'],
        documentsToBring: ['Copy of contract'],
        importantDeadlines: ['30 days'],
        keyConcerns: ['Liability'],
        clarificationAreas: ['IP rights'],
      },
      actionChecklist: [
        { id: 'a1', label: 'Review with counsel', category: 'General', completed: false },
      ],
    };
  }
}

describe('Use Cases Layer Units', () => {
  let userRepo: MockUserRepo;
  let docRepo: MockDocRepo;
  let analysisRepo: MockAnalysisRepo;
  let compRepo: MockCompRepo;
  let chatRepo: MockChatRepo;
  let briefingRepo: MockBriefingRepo;
  let hasher: MockHasher;
  let tokenSvc: MockTokenSvc;
  let vecStore: MockVecStore;
  let embedSvc: MockEmbedSvc;
  let parser: MockDocParser;
  let validator: MockValidator;
  let llm: MockLLM;

  beforeEach(() => {
    userRepo = new MockUserRepo();
    docRepo = new MockDocRepo();
    analysisRepo = new MockAnalysisRepo();
    compRepo = new MockCompRepo();
    chatRepo = new MockChatRepo();
    briefingRepo = new MockBriefingRepo();
    hasher = new MockHasher();
    tokenSvc = new MockTokenSvc();
    vecStore = new MockVecStore();
    embedSvc = new MockEmbedSvc();
    parser = new MockDocParser();
    validator = new MockValidator();
    llm = new MockLLM();
  });

  describe('Auth Use Cases', () => {
    it('registers user successfully', async () => {
      const uc = new RegisterUserUseCase(userRepo, hasher, tokenSvc);
      const res = await uc.execute({ email: 'user@example.com', password: 'password123', name: 'User One' });
      expect(res.user.email).toBe('user@example.com');
      expect(res.token).toContain('tok_');
    });

    it('validates register inputs and duplicate emails', async () => {
      const uc = new RegisterUserUseCase(userRepo, hasher, tokenSvc);
      await expect(uc.execute({ email: '', password: 'password123', name: 'User' })).rejects.toThrow(ValidationError);
      await expect(uc.execute({ email: 'u@e.com', password: '123', name: 'User' })).rejects.toThrow(ValidationError);

      await uc.execute({ email: 'u@e.com', password: 'password123', name: 'User' });
      await expect(uc.execute({ email: 'u@e.com', password: 'password123', name: 'User' })).rejects.toThrow(ConflictError);
    });

    it('logs in user successfully and handles invalid credentials', async () => {
      const reg = new RegisterUserUseCase(userRepo, hasher, tokenSvc);
      await reg.execute({ email: 'u@e.com', password: 'password123', name: 'User' });

      const login = new LoginUserUseCase(userRepo, hasher, tokenSvc);
      const res = await login.execute({ email: 'u@e.com', password: 'password123' });
      expect(res.user.email).toBe('u@e.com');

      await expect(login.execute({ email: '', password: 'pw' })).rejects.toThrow(ValidationError);
      await expect(login.execute({ email: 'nonexistent@e.com', password: 'pw' })).rejects.toThrow(AuthenticationError);
      await expect(login.execute({ email: 'u@e.com', password: 'wrongpassword' })).rejects.toThrow(AuthenticationError);
    });

    it('retrieves user profile or throws NotFoundError', async () => {
      const getProfile = new GetUserProfileUseCase(userRepo);
      await expect(getProfile.execute('nonexistent')).rejects.toThrow(NotFoundError);

      const user = new User({ id: 'u1', email: 'a@b.com', passwordHash: 'h', name: 'A', createdAt: new Date(), updatedAt: new Date() });
      await userRepo.create(user);
      const profile = await getProfile.execute('u1');
      expect(profile.name).toBe('A');
    });

    it('deletes user account and cascades all associated data', async () => {
      const del = new DeleteAccountUseCase(userRepo, docRepo, compRepo, vecStore);
      await expect(del.execute('nonexistent')).rejects.toThrow(NotFoundError);

      const user = new User({ id: 'u1', email: 'a@b.com', passwordHash: 'h', name: 'A', createdAt: new Date(), updatedAt: new Date() });
      await userRepo.create(user);

      const doc = new LegalDocument({
        id: 'd1', userId: 'u1', title: 'Doc', originalFilename: 'doc.txt', mimeType: 'text/plain',
        fileSizeBytes: 10, storagePath: 'p', pageCount: 1, characterCount: 10, status: 'ready', createdAt: new Date(), updatedAt: new Date(),
      });
      await docRepo.create(doc);

      const comp = new Comparison({
        id: 'c1', userId: 'u1', documentAId: 'd1', documentBId: 'd2', documentATitle: 'A', documentBTitle: 'B',
        executiveSummary: 'Summ', addedClauses: [], removedClauses: [], modifiedClauses: [], changedObligations: [],
        changedFinancialTerms: [], changedDates: [], changedTermination: [], changedLiability: [], changedDisputeResolution: [], createdAt: new Date(),
      });
      await compRepo.save(comp);

      await del.execute('u1');
      expect(await userRepo.findById('u1')).toBeNull();
      expect(await docRepo.findById('d1')).toBeNull();
      expect(await compRepo.findById('c1')).toBeNull();
    });
  });

  describe('Document Use Cases', () => {
    it('uploads, chunks, and indexes legal document', async () => {
      const uc = new UploadDocumentUseCase(docRepo, parser, embedSvc, vecStore, validator);
      const doc = await uc.execute({
        userId: 'u1',
        title: ' My Agreement ',
        file: {
          originalname: 'contract.txt',
          mimetype: 'text/plain',
          size: 100,
          buffer: Buffer.from('Section 1. Heading\n\nContent here\n\nSection 2. Term\n\nTermination clause'),
        },
      });

      expect(doc.id).toContain('doc_');
      expect(doc.title).toBe('My Agreement');
      expect(await docRepo.findById(doc.id)).toBeDefined();
      expect(vecStore.chunks.get(doc.id)?.length).toBeGreaterThan(0);
    });

    it('validates upload input and file validator errors', async () => {
      const uc = new UploadDocumentUseCase(docRepo, parser, embedSvc, vecStore, validator);
      await expect(uc.execute({ userId: '', title: 'T', file: {} as any })).rejects.toThrow(ValidationError);

      validator.shouldFail = true;
      await expect(uc.execute({ userId: 'u1', title: 'T', file: {} as any })).rejects.toThrow(ValidationError);
    });

    it('gets document and verifies user ownership (IDOR check)', async () => {
      const doc = new LegalDocument({
        id: 'd1', userId: 'u1', title: 'Doc', originalFilename: 'd.txt', mimeType: 'text/plain',
        fileSizeBytes: 10, storagePath: 'p', pageCount: 1, characterCount: 10, status: 'ready', createdAt: new Date(), updatedAt: new Date(),
      });
      await docRepo.create(doc);

      const uc = new GetDocumentUseCase(docRepo);
      const res = await uc.execute('d1', 'u1');
      expect(res.id).toBe('d1');

      await expect(uc.execute('nonexistent', 'u1')).rejects.toThrow(NotFoundError);
      await expect(uc.execute('d1', 'attacker_user')).rejects.toThrow(ForbiddenError);
    });

    it('lists documents for user', async () => {
      const uc = new ListDocumentsUseCase(docRepo);
      const list = await uc.execute('u1');
      expect(list).toEqual([]);
    });

    it('deletes document and verifies ownership', async () => {
      const doc = new LegalDocument({
        id: 'd1', userId: 'u1', title: 'Doc', originalFilename: 'd.txt', mimeType: 'text/plain',
        fileSizeBytes: 10, storagePath: 'p', pageCount: 1, characterCount: 10, status: 'ready', createdAt: new Date(), updatedAt: new Date(),
      });
      await docRepo.create(doc);

      const uc = new DeleteDocumentUseCase(docRepo, vecStore, analysisRepo, chatRepo, briefingRepo);
      await expect(uc.execute('nonexistent', 'u1')).rejects.toThrow(NotFoundError);
      await expect(uc.execute('d1', 'attacker')).rejects.toThrow(ForbiddenError);

      await uc.execute('d1', 'u1');
      expect(await docRepo.findById('d1')).toBeNull();
    });

    it('searches document chunks with query snippets', async () => {
      const doc = new LegalDocument({
        id: 'd1', userId: 'u1', title: 'Doc', originalFilename: 'd.txt', mimeType: 'text/plain',
        fileSizeBytes: 10, storagePath: 'p', pageCount: 1, characterCount: 10, status: 'ready', createdAt: new Date(), updatedAt: new Date(),
      });
      await docRepo.create(doc);

      const chunk = new DocumentChunk({
        id: 'c1', documentId: 'd1', chunkIndex: 0, pageNumber: 1, sectionHeading: 'Notice',
        content: 'Notice must be provided 30 days prior to contract termination.', tokenCount: 10,
      });
      await vecStore.upsertChunks([chunk]);

      const uc = new SearchDocumentUseCase(docRepo, vecStore);
      expect(await uc.execute('d1', 'u1', '')).toEqual([]);

      await expect(uc.execute('nonexistent', 'u1', 'test')).rejects.toThrow(NotFoundError);
      await expect(uc.execute('d1', 'attacker', 'test')).rejects.toThrow(ForbiddenError);

      const results = await uc.execute('d1', 'u1', 'termination');
      expect(results).toHaveLength(1);
      expect(results[0].matchedSnippet).toContain('termination');
    });
  });

  describe('Analysis Use Cases', () => {
    it('analyzes document, caches result, and supports force reanalysis', async () => {
      const doc = new LegalDocument({
        id: 'd1', userId: 'u1', title: 'Doc', originalFilename: 'd.txt', mimeType: 'text/plain',
        fileSizeBytes: 10, storagePath: 'p', pageCount: 1, characterCount: 10, status: 'ready', createdAt: new Date(), updatedAt: new Date(),
      });
      await docRepo.create(doc);

      const analyzeUc = new AnalyzeDocumentUseCase(docRepo, analysisRepo, vecStore, llm);
      await expect(analyzeUc.execute('nonexistent', 'u1')).rejects.toThrow(NotFoundError);
      await expect(analyzeUc.execute('d1', 'attacker')).rejects.toThrow(ForbiddenError);

      const analysis1 = await analyzeUc.execute('d1', 'u1');
      expect(analysis1.documentId).toBe('d1');

      // Cached return
      const analysis2 = await analyzeUc.execute('d1', 'u1', false);
      expect(analysis2.id).toBe(analysis1.id);

      // Force reanalysis
      const analysis3 = await analyzeUc.execute('d1', 'u1', true);
      expect(analysis3.documentId).toBe('d1');

      // GetDocumentAnalysisUseCase
      const getAnalysisUc = new GetDocumentAnalysisUseCase(docRepo, analysisRepo, analyzeUc);
      const res = await getAnalysisUc.execute('d1', 'u1');
      expect(res.id).toBe(analysis3.id);

      await expect(getAnalysisUc.execute('nonexistent', 'u1')).rejects.toThrow(NotFoundError);
      await expect(getAnalysisUc.execute('d1', 'attacker')).rejects.toThrow(ForbiddenError);
    });
  });

  describe('Comparison Use Cases', () => {
    it('compares two documents with ownership verification', async () => {
      const docA = new LegalDocument({
        id: 'dA', userId: 'u1', title: 'Doc A', originalFilename: 'dA.txt', mimeType: 'text/plain',
        fileSizeBytes: 10, storagePath: 'p', pageCount: 1, characterCount: 10, status: 'ready', createdAt: new Date(), updatedAt: new Date(),
      });
      const docB = new LegalDocument({
        id: 'dB', userId: 'u1', title: 'Doc B', originalFilename: 'dB.txt', mimeType: 'text/plain',
        fileSizeBytes: 10, storagePath: 'p', pageCount: 1, characterCount: 10, status: 'ready', createdAt: new Date(), updatedAt: new Date(),
      });
      await docRepo.create(docA);
      await docRepo.create(docB);

      const compUc = new CompareDocumentsUseCase(docRepo, compRepo, vecStore, llm);

      await expect(compUc.execute({ userId: 'u1', documentAId: '', documentBId: 'dB' })).rejects.toThrow(ValidationError);
      await expect(compUc.execute({ userId: 'u1', documentAId: 'dA', documentBId: 'dA' })).rejects.toThrow(ValidationError);
      await expect(compUc.execute({ userId: 'u1', documentAId: 'missing', documentBId: 'dB' })).rejects.toThrow(NotFoundError);
      await expect(compUc.execute({ userId: 'attacker', documentAId: 'dA', documentBId: 'dB' })).rejects.toThrow(ForbiddenError);
      await expect(compUc.execute({ userId: 'u1', documentAId: 'dA', documentBId: 'missing' })).rejects.toThrow(NotFoundError);

      // Create doc owned by another user
      const docOther = new LegalDocument({
        id: 'dOther', userId: 'u2', title: 'Other', originalFilename: 'o.txt', mimeType: 'text/plain',
        fileSizeBytes: 10, storagePath: 'p', pageCount: 1, characterCount: 10, status: 'ready', createdAt: new Date(), updatedAt: new Date(),
      });
      await docRepo.create(docOther);
      await expect(compUc.execute({ userId: 'u1', documentAId: 'dA', documentBId: 'dOther' })).rejects.toThrow(ForbiddenError);

      const comparison = await compUc.execute({ userId: 'u1', documentAId: 'dA', documentBId: 'dB' });
      expect(comparison.id).toContain('cmp_');

      const getComp = new GetComparisonUseCase(compRepo);
      await expect(getComp.execute('missing', 'u1')).rejects.toThrow(NotFoundError);
      await expect(getComp.execute(comparison.id, 'attacker')).rejects.toThrow(ForbiddenError);
      const fetched = await getComp.execute(comparison.id, 'u1');
      expect(fetched.id).toBe(comparison.id);

      const listComp = new ListComparisonsUseCase(compRepo);
      const list = await listComp.execute('u1');
      expect(list).toHaveLength(1);
    });
  });

  describe('Chat Use Cases', () => {
    it('answers grounded questions with RAG pipeline and manages history', async () => {
      const doc = new LegalDocument({
        id: 'd1', userId: 'u1', title: 'Doc', originalFilename: 'd.txt', mimeType: 'text/plain',
        fileSizeBytes: 10, storagePath: 'p', pageCount: 1, characterCount: 10, status: 'ready', createdAt: new Date(), updatedAt: new Date(),
      });
      await docRepo.create(doc);

      const askUc = new AskDocumentChatUseCase(docRepo, chatRepo, vecStore, embedSvc, llm);
      await expect(askUc.execute({ userId: 'u1', documentId: 'd1', question: '' })).rejects.toThrow(ValidationError);
      await expect(askUc.execute({ userId: 'u1', documentId: 'missing', question: 'Hello?' })).rejects.toThrow(NotFoundError);
      await expect(askUc.execute({ userId: 'attacker', documentId: 'd1', question: 'Hello?' })).rejects.toThrow(ForbiddenError);

      const assistantMsg = await askUc.execute({ userId: 'u1', documentId: 'd1', question: 'Who owns IP?' });
      expect(assistantMsg.role).toBe('assistant');
      expect(assistantMsg.structuredAnswer?.grounded).toBe(true);

      const getHistory = new GetChatHistoryUseCase(docRepo, chatRepo);
      await expect(getHistory.execute('missing', 'u1')).rejects.toThrow(NotFoundError);
      await expect(getHistory.execute('d1', 'attacker')).rejects.toThrow(ForbiddenError);
      const history = await getHistory.execute('d1', 'u1');
      expect(history).toHaveLength(2); // user msg + assistant msg

      const clearHistory = new ClearChatHistoryUseCase(docRepo, chatRepo);
      await expect(clearHistory.execute('missing', 'u1')).rejects.toThrow(NotFoundError);
      await expect(clearHistory.execute('d1', 'attacker')).rejects.toThrow(ForbiddenError);
      await clearHistory.execute('d1', 'u1');
      expect(await getHistory.execute('d1', 'u1')).toHaveLength(0);
    });
  });

  describe('Briefing and Checklist Use Cases', () => {
    it('generates briefing, toggles checklist items, and retrieves briefings', async () => {
      const doc = new LegalDocument({
        id: 'd1', userId: 'u1', title: 'Doc', originalFilename: 'd.txt', mimeType: 'text/plain',
        fileSizeBytes: 10, storagePath: 'p', pageCount: 1, characterCount: 10, status: 'ready', createdAt: new Date(), updatedAt: new Date(),
      });
      await docRepo.create(doc);

      const analyzeUc = new AnalyzeDocumentUseCase(docRepo, analysisRepo, vecStore, llm);
      const genBriefing = new GenerateLegalBriefingUseCase(docRepo, briefingRepo, analysisRepo, analyzeUc, llm);

      await expect(genBriefing.execute('missing', 'u1')).rejects.toThrow(NotFoundError);
      await expect(genBriefing.execute('d1', 'attacker')).rejects.toThrow(ForbiddenError);

      const briefing = await genBriefing.execute('d1', 'u1');
      expect(briefing.documentId).toBe('d1');

      const getBriefing = new GetLegalBriefingUseCase(docRepo, briefingRepo, genBriefing);
      await expect(getBriefing.execute('missing', 'u1')).rejects.toThrow(NotFoundError);
      await expect(getBriefing.execute('d1', 'attacker')).rejects.toThrow(ForbiddenError);
      const fetched = await getBriefing.execute('d1', 'u1');
      expect(fetched.id).toBe(briefing.id);

      const updateChecklist = new UpdateActionChecklistUseCase(docRepo, briefingRepo);
      await expect(updateChecklist.execute('missing', 'u1', 'a1')).rejects.toThrow(NotFoundError);
      await expect(updateChecklist.execute('d1', 'attacker', 'a1')).rejects.toThrow(ForbiddenError);

      const updated = await updateChecklist.execute('d1', 'u1', 'a1', true);
      expect(updated.actionChecklist[0].completed).toBe(true);

      // Briefing not found on toggle
      await briefingRepo.delete('d1');
      await expect(updateChecklist.execute('d1', 'u1', 'a1', true)).rejects.toThrow(NotFoundError);
    });
  });

  describe('Dashboard and Demo Use Cases', () => {
    it('retrieves dashboard stats with counts and pending items', async () => {
      const doc = new LegalDocument({
        id: 'd1', userId: 'u1', title: 'Doc', originalFilename: 'd.txt', mimeType: 'text/plain',
        fileSizeBytes: 10, storagePath: 'p', pageCount: 1, characterCount: 10, status: 'ready', createdAt: new Date(), updatedAt: new Date(),
      });
      await docRepo.create(doc);

      const analyzeUc = new AnalyzeDocumentUseCase(docRepo, analysisRepo, vecStore, llm);
      await analyzeUc.execute('d1', 'u1');

      const genBriefing = new GenerateLegalBriefingUseCase(docRepo, briefingRepo, analysisRepo, analyzeUc, llm);
      await genBriefing.execute('d1', 'u1');

      const statsUc = new GetDashboardStatsUseCase(docRepo, analysisRepo, briefingRepo);
      const stats = await statsUc.execute('u1');

      expect(stats.totalDocuments).toBe(1);
      expect(stats.totalAnalyses).toBe(1);
      expect(stats.totalPendingActionItems).toBe(1);
      expect(stats.recentDocuments).toHaveLength(1);
    });

    it('loads demo template and auto-analyzes it', async () => {
      const uploadUc = new UploadDocumentUseCase(docRepo, parser, embedSvc, vecStore, validator);
      const analyzeUc = new AnalyzeDocumentUseCase(docRepo, analysisRepo, vecStore, llm);

      const templates: DemoTemplate[] = [
        { id: 'demo-1', title: 'Demo Employment', category: 'Employment', description: 'Desc', filename: 'demo.txt', content: 'Section 1. Terms' },
      ];

      const demoUc = new LoadDemoDocumentUseCase(uploadUc, analyzeUc, templates);
      await expect(demoUc.execute('missing-template', 'u1')).rejects.toThrow(NotFoundError);
      await expect(demoUc.execute('demo-1', '')).rejects.toThrow(ValidationError);

      const doc = await demoUc.execute('demo-1', 'u1');
      expect(doc.title).toBe('Demo Employment');
      expect(await analysisRepo.findByDocumentId(doc.id)).toBeDefined();
    });
  });
});
