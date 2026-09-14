import { describe, it, expect } from 'vitest';
import {
  DomainError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  SecurityViolationError,
  RateLimitError,
} from '../../src/core/domain/Errors';
import { User } from '../../src/core/domain/User';
import { LegalDocument } from '../../src/core/domain/LegalDocument';
import { DocumentChunk } from '../../src/core/domain/DocumentChunk';
import { ImportantClause } from '../../src/core/domain/ImportantClause';
import { AttentionFinding } from '../../src/core/domain/AttentionFinding';
import { DocumentAnalysis } from '../../src/core/domain/DocumentAnalysis';
import { Comparison } from '../../src/core/domain/Comparison';
import { ChatMessage } from '../../src/core/domain/ChatMessage';
import { LegalBriefing } from '../../src/core/domain/LegalBriefing';

describe('Domain Layer Units', () => {
  describe('Domain Errors', () => {
    it('creates DomainError with default and custom values', () => {
      const err = new DomainError('Custom domain error', 418, 'I_AM_A_TEAPOT');
      expect(err.message).toBe('Custom domain error');
      expect(err.statusCode).toBe(418);
      expect(err.code).toBe('I_AM_A_TEAPOT');
      expect(err.name).toBe('DomainError');

      const defaultErr = new DomainError('Default err');
      expect(defaultErr.statusCode).toBe(400);
      expect(defaultErr.code).toBe('DOMAIN_ERROR');
    });

    it('creates ValidationError with and without details', () => {
      const vErr1 = new ValidationError('Bad input');
      expect(vErr1.statusCode).toBe(400);
      expect(vErr1.code).toBe('VALIDATION_ERROR');
      expect(vErr1.details).toBeUndefined();

      const vErr2 = new ValidationError('Invalid fields', { email: ['Invalid email'] });
      expect(vErr2.details?.email).toContain('Invalid email');
    });

    it('creates AuthenticationError, ForbiddenError, NotFoundError, ConflictError, SecurityViolationError, RateLimitError', () => {
      const authErr = new AuthenticationError();
      expect(authErr.statusCode).toBe(401);
      expect(authErr.code).toBe('AUTHENTICATION_ERROR');

      const forbErr = new ForbiddenError();
      expect(forbErr.statusCode).toBe(403);
      expect(forbErr.code).toBe('FORBIDDEN_ERROR');

      const notFoundErr = new NotFoundError();
      expect(notFoundErr.statusCode).toBe(404);
      expect(notFoundErr.code).toBe('NOT_FOUND');

      const conflictErr = new ConflictError();
      expect(conflictErr.statusCode).toBe(409);
      expect(conflictErr.code).toBe('CONFLICT_ERROR');

      const secErr = new SecurityViolationError();
      expect(secErr.statusCode).toBe(422);
      expect(secErr.code).toBe('SECURITY_VIOLATION');

      const rateErr = new RateLimitError();
      expect(rateErr.statusCode).toBe(429);
      expect(rateErr.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('User Entity', () => {
    const now = new Date();

    it('creates a valid User and sanitizes output', () => {
      const user = new User({
        id: 'u1',
        email: 'TEST@example.com ',
        passwordHash: 'hash123',
        name: ' Test User ',
        createdAt: now,
        updatedAt: now,
      });

      expect(user.id).toBe('u1');
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.passwordHash).toBe('hash123');
      expect(user.createdAt).toBe(now);
      expect(user.updatedAt).toBe(now);

      const sanitized = user.toSanitized();
      expect(sanitized.email).toBe('test@example.com');
      expect((sanitized as any).passwordHash).toBeUndefined();
    });

    it('throws on invalid email or empty name', () => {
      expect(() => new User({
        id: 'u1',
        email: 'invalid-email',
        passwordHash: 'hash',
        name: 'Alex',
        createdAt: now,
        updatedAt: now,
      })).toThrow(ValidationError);

      expect(() => new User({
        id: 'u1',
        email: 'test@example.com',
        passwordHash: 'hash',
        name: '   ',
        createdAt: now,
        updatedAt: now,
      })).toThrow(ValidationError);
    });

    it('updates profile and throws on invalid updated name', () => {
      const user = new User({
        id: 'u1',
        email: 'test@example.com',
        passwordHash: 'hash',
        name: 'Alex',
        createdAt: now,
        updatedAt: now,
      });

      user.updateProfile('Alex Morgan');
      expect(user.name).toBe('Alex Morgan');

      expect(() => user.updateProfile('')).toThrow(ValidationError);
    });
  });

  describe('LegalDocument Entity', () => {
    const now = new Date();

    it('creates a valid LegalDocument and handles state transitions', () => {
      const doc = new LegalDocument({
        id: 'doc1',
        userId: 'u1',
        title: ' Employment Agreement ',
        originalFilename: 'employment.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 1024,
        storagePath: 'uploads/u1/doc1.pdf',
        pageCount: 1,
        characterCount: 500,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      });

      expect(doc.id).toBe('doc1');
      expect(doc.userId).toBe('u1');
      expect(doc.title).toBe('Employment Agreement');
      expect(doc.originalFilename).toBe('employment.pdf');
      expect(doc.mimeType).toBe('application/pdf');
      expect(doc.fileSizeBytes).toBe(1024);
      expect(doc.storagePath).toBe('uploads/u1/doc1.pdf');
      expect(doc.pageCount).toBe(1);
      expect(doc.characterCount).toBe(500);
      expect(doc.status).toBe('pending');
      expect(doc.errorMessage).toBeNull();
      expect(doc.createdAt).toBe(now);
      expect(doc.updatedAt).toBe(now);
      expect(doc.isOwnedBy('u1')).toBe(true);
      expect(doc.isOwnedBy('u2')).toBe(false);

      doc.markProcessing();
      expect(doc.status).toBe('processing');

      doc.markReady(5, 12000);
      expect(doc.status).toBe('ready');
      expect(doc.pageCount).toBe(5);
      expect(doc.characterCount).toBe(12000);

      doc.markFailed('Corrupt file');
      expect(doc.status).toBe('failed');
      expect(doc.errorMessage).toBe('Corrupt file');

      const json = doc.toJSON();
      expect(json.id).toBe('doc1');
      expect(json.status).toBe('failed');
    });

    it('validates required fields and non-negative size', () => {
      expect(() => new LegalDocument({
        id: '',
        userId: 'u1',
        title: 'Title',
        originalFilename: 'file.txt',
        mimeType: 'text/plain',
        fileSizeBytes: 10,
        storagePath: 'path',
        pageCount: 1,
        characterCount: 10,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      })).toThrow(ValidationError);

      expect(() => new LegalDocument({
        id: 'd1',
        userId: '',
        title: 'Title',
        originalFilename: 'file.txt',
        mimeType: 'text/plain',
        fileSizeBytes: 10,
        storagePath: 'path',
        pageCount: 1,
        characterCount: 10,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      })).toThrow(ValidationError);

      expect(() => new LegalDocument({
        id: 'd1',
        userId: 'u1',
        title: '   ',
        originalFilename: 'file.txt',
        mimeType: 'text/plain',
        fileSizeBytes: 10,
        storagePath: 'path',
        pageCount: 1,
        characterCount: 10,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      })).toThrow(ValidationError);

      expect(() => new LegalDocument({
        id: 'd1',
        userId: 'u1',
        title: 'Title',
        originalFilename: 'file.txt',
        mimeType: 'text/plain',
        fileSizeBytes: -1,
        storagePath: 'path',
        pageCount: 1,
        characterCount: 10,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      })).toThrow(ValidationError);
    });
  });

  describe('DocumentChunk Entity', () => {
    it('creates a valid DocumentChunk and sets embedding', () => {
      const chunk = new DocumentChunk({
        id: 'chk1',
        documentId: 'doc1',
        chunkIndex: 0,
        pageNumber: 1,
        sectionHeading: 'Section 1',
        content: 'This is clause content',
        tokenCount: 4,
      });

      expect(chunk.id).toBe('chk1');
      expect(chunk.documentId).toBe('doc1');
      expect(chunk.chunkIndex).toBe(0);
      expect(chunk.pageNumber).toBe(1);
      expect(chunk.sectionHeading).toBe('Section 1');
      expect(chunk.content).toBe('This is clause content');
      expect(chunk.tokenCount).toBe(4);
      expect(chunk.embedding).toBeNull();

      chunk.setEmbedding([0.1, 0.2, 0.3]);
      expect(chunk.embedding).toEqual([0.1, 0.2, 0.3]);

      const json = chunk.toJSON();
      expect(json.chunkIndex).toBe(0);
    });

    it('validates required fields in DocumentChunk', () => {
      expect(() => new DocumentChunk({
        id: '',
        documentId: 'doc1',
        chunkIndex: 0,
        pageNumber: 1,
        sectionHeading: 'S1',
        content: 'Content',
        tokenCount: 1,
      })).toThrow(ValidationError);

      expect(() => new DocumentChunk({
        id: 'c1',
        documentId: '',
        chunkIndex: 0,
        pageNumber: 1,
        sectionHeading: 'S1',
        content: 'Content',
        tokenCount: 1,
      })).toThrow(ValidationError);

      expect(() => new DocumentChunk({
        id: 'c1',
        documentId: 'doc1',
        chunkIndex: 0,
        pageNumber: 1,
        sectionHeading: 'S1',
        content: '',
        tokenCount: 1,
      })).toThrow(ValidationError);
    });
  });

  describe('ImportantClause Entity', () => {
    it('creates and serializes ImportantClause', () => {
      const clause = new ImportantClause({
        id: 'cls1',
        documentId: 'doc1',
        category: 'indemnification',
        title: 'Indemnity',
        originalText: 'Party shall indemnify...',
        plainExplanation: 'You may have to pay losses...',
        whyItMatters: 'Financial exposure',
        concernLevel: 'high_attention',
        pageNumber: 2,
        sectionHeading: 'Section 4',
      });

      expect(clause.id).toBe('cls1');
      expect(clause.category).toBe('indemnification');
      expect(clause.title).toBe('Indemnity');
      expect(clause.originalText).toBe('Party shall indemnify...');
      expect(clause.plainExplanation).toBe('You may have to pay losses...');
      expect(clause.whyItMatters).toBe('Financial exposure');
      expect(clause.concernLevel).toBe('high_attention');
      expect(clause.pageNumber).toBe(2);
      expect(clause.sectionHeading).toBe('Section 4');

      const json = clause.toJSON();
      expect(json.id).toBe('cls1');
    });

    it('validates ImportantClause fields', () => {
      expect(() => new ImportantClause({
        id: '',
        documentId: 'd1',
        category: 'other',
        title: 'Title',
        originalText: 'text',
        plainExplanation: 'plain',
        whyItMatters: 'matters',
        concernLevel: 'informational',
        pageNumber: 1,
        sectionHeading: 'S1',
      })).toThrow(ValidationError);

      expect(() => new ImportantClause({
        id: 'c1',
        documentId: '',
        category: 'other',
        title: 'Title',
        originalText: 'text',
        plainExplanation: 'plain',
        whyItMatters: 'matters',
        concernLevel: 'informational',
        pageNumber: 1,
        sectionHeading: 'S1',
      })).toThrow(ValidationError);

      expect(() => new ImportantClause({
        id: 'c1',
        documentId: 'd1',
        category: 'other',
        title: '',
        originalText: 'text',
        plainExplanation: 'plain',
        whyItMatters: 'matters',
        concernLevel: 'informational',
        pageNumber: 1,
        sectionHeading: 'S1',
      })).toThrow(ValidationError);

      expect(() => new ImportantClause({
        id: 'c1',
        documentId: 'd1',
        category: 'other',
        title: 'Title',
        originalText: 'text',
        plainExplanation: '',
        whyItMatters: 'matters',
        concernLevel: 'informational',
        pageNumber: 1,
        sectionHeading: 'S1',
      })).toThrow(ValidationError);
    });
  });

  describe('AttentionFinding Entity', () => {
    it('creates and serializes AttentionFinding', () => {
      const finding = new AttentionFinding({
        id: 'fnd1',
        documentId: 'doc1',
        category: 'high_attention',
        finding: 'Broad indemnity scope',
        whyItMatters: 'Substantial liability',
        sourceReference: 'Page 3, Section 5',
        pageNumber: 3,
        sectionHeading: 'Section 5',
        questionsToConsider: ['Can this be capped?'],
        suggestedProfessionalFollowUp: 'Consult counsel',
      });

      expect(finding.id).toBe('fnd1');
      expect(finding.category).toBe('high_attention');
      expect(finding.finding).toBe('Broad indemnity scope');
      expect(finding.whyItMatters).toBe('Substantial liability');
      expect(finding.sourceReference).toBe('Page 3, Section 5');
      expect(finding.pageNumber).toBe(3);
      expect(finding.sectionHeading).toBe('Section 5');
      expect(finding.questionsToConsider).toContain('Can this be capped?');
      expect(finding.suggestedProfessionalFollowUp).toBe('Consult counsel');

      const json = finding.toJSON();
      expect(json.id).toBe('fnd1');
    });

    it('validates AttentionFinding fields', () => {
      expect(() => new AttentionFinding({
        id: '',
        documentId: 'd1',
        category: 'informational',
        finding: 'Finding',
        whyItMatters: 'Matters',
        sourceReference: 'Ref',
        pageNumber: 1,
        sectionHeading: 'S1',
        questionsToConsider: [],
        suggestedProfessionalFollowUp: 'Follow up',
      })).toThrow(ValidationError);

      expect(() => new AttentionFinding({
        id: 'f1',
        documentId: '',
        category: 'informational',
        finding: 'Finding',
        whyItMatters: 'Matters',
        sourceReference: 'Ref',
        pageNumber: 1,
        sectionHeading: 'S1',
        questionsToConsider: [],
        suggestedProfessionalFollowUp: 'Follow up',
      })).toThrow(ValidationError);

      expect(() => new AttentionFinding({
        id: 'f1',
        documentId: 'd1',
        category: 'informational',
        finding: '',
        whyItMatters: 'Matters',
        sourceReference: 'Ref',
        pageNumber: 1,
        sectionHeading: 'S1',
        questionsToConsider: [],
        suggestedProfessionalFollowUp: 'Follow up',
      })).toThrow(ValidationError);

      expect(() => new AttentionFinding({
        id: 'f1',
        documentId: 'd1',
        category: 'informational',
        finding: 'Finding',
        whyItMatters: '',
        sourceReference: 'Ref',
        pageNumber: 1,
        sectionHeading: 'S1',
        questionsToConsider: [],
        suggestedProfessionalFollowUp: 'Follow up',
      })).toThrow(ValidationError);
    });
  });

  describe('DocumentAnalysis Entity', () => {
    const now = new Date();

    it('creates and serializes DocumentAnalysis', () => {
      const analysis = new DocumentAnalysis({
        id: 'anl1',
        documentId: 'doc1',
        documentType: 'Employment Agreement',
        partiesInvolved: ['Apex Corp', 'Jane Doe'],
        effectiveDate: '2025-01-01',
        expirationDate: '2026-01-01',
        jurisdiction: 'Delaware',
        highLevelSummary: 'Summary of agreement',
        plainLanguageSummary: {
          whatThisDocumentIsAbout: 'Employment agreement',
          whatYouAreAgreeingTo: ['Work full time'],
          whatTheOtherPartyIsAgreeingTo: ['Pay salary'],
          yourKeyResponsibilities: ['Engineering lead'],
          yourRights: ['Paid leave'],
          importantDates: ['Jan 1'],
          financialObligations: ['None'],
          terminationConditions: ['30 days notice'],
        },
        extractedFacts: [
          {
            category: 'Salary',
            fact: '$180k',
            verbatimExcerpt: 'Base salary of $180,000',
            pageNumber: 1,
          },
        ],
        clauses: [],
        findings: [],
        createdAt: now,
        updatedAt: now,
      });

      expect(analysis.id).toBe('anl1');
      expect(analysis.documentType).toBe('Employment Agreement');
      expect(analysis.partiesInvolved).toEqual(['Apex Corp', 'Jane Doe']);
      expect(analysis.effectiveDate).toBe('2025-01-01');
      expect(analysis.expirationDate).toBe('2026-01-01');
      expect(analysis.jurisdiction).toBe('Delaware');
      expect(analysis.highLevelSummary).toBe('Summary of agreement');
      expect(analysis.extractedFacts).toHaveLength(1);
      expect(analysis.createdAt).toBe(now);
      expect(analysis.updatedAt).toBe(now);

      const json = analysis.toJSON();
      expect(json.id).toBe('anl1');
    });

    it('validates DocumentAnalysis fields', () => {
      expect(() => new DocumentAnalysis({
        id: '',
        documentId: 'doc1',
        documentType: 'Type',
        partiesInvolved: [],
        effectiveDate: null,
        expirationDate: null,
        jurisdiction: null,
        highLevelSummary: 'Summary',
        plainLanguageSummary: {} as any,
        extractedFacts: [],
        clauses: [],
        findings: [],
        createdAt: now,
        updatedAt: now,
      })).toThrow(ValidationError);

      expect(() => new DocumentAnalysis({
        id: 'a1',
        documentId: '',
        documentType: 'Type',
        partiesInvolved: [],
        effectiveDate: null,
        expirationDate: null,
        jurisdiction: null,
        highLevelSummary: 'Summary',
        plainLanguageSummary: {} as any,
        extractedFacts: [],
        clauses: [],
        findings: [],
        createdAt: now,
        updatedAt: now,
      })).toThrow(ValidationError);

      expect(() => new DocumentAnalysis({
        id: 'a1',
        documentId: 'doc1',
        documentType: 'Type',
        partiesInvolved: [],
        effectiveDate: null,
        expirationDate: null,
        jurisdiction: null,
        highLevelSummary: '   ',
        plainLanguageSummary: {} as any,
        extractedFacts: [],
        clauses: [],
        findings: [],
        createdAt: now,
        updatedAt: now,
      })).toThrow(ValidationError);
    });
  });

  describe('Comparison Entity', () => {
    const now = new Date();

    it('creates and serializes Comparison', () => {
      const comp = new Comparison({
        id: 'cmp1',
        userId: 'u1',
        documentAId: 'docA',
        documentBId: 'docB',
        documentATitle: 'Doc A',
        documentBTitle: 'Doc B',
        executiveSummary: 'Major differences summary',
        addedClauses: [
          {
            category: 'Arbitration',
            documentA: 'Court',
            documentB: 'Arbitration',
            difference: 'Added binding arbitration',
            whyItMatters: 'Waives jury trial',
            impactLevel: 'significant',
          },
        ],
        removedClauses: [],
        modifiedClauses: [],
        changedObligations: [],
        changedFinancialTerms: [],
        changedDates: [],
        changedTermination: [],
        changedLiability: [],
        changedDisputeResolution: [],
        createdAt: now,
      });

      expect(comp.id).toBe('cmp1');
      expect(comp.userId).toBe('u1');
      expect(comp.documentAId).toBe('docA');
      expect(comp.documentBId).toBe('docB');
      expect(comp.documentATitle).toBe('Doc A');
      expect(comp.documentBTitle).toBe('Doc B');
      expect(comp.executiveSummary).toBe('Major differences summary');
      expect(comp.addedClauses).toHaveLength(1);
      expect(comp.removedClauses).toHaveLength(0);
      expect(comp.modifiedClauses).toHaveLength(0);
      expect(comp.changedObligations).toHaveLength(0);
      expect(comp.changedFinancialTerms).toHaveLength(0);
      expect(comp.changedDates).toHaveLength(0);
      expect(comp.changedTermination).toHaveLength(0);
      expect(comp.changedLiability).toHaveLength(0);
      expect(comp.changedDisputeResolution).toHaveLength(0);
      expect(comp.createdAt).toBe(now);
      expect(comp.isOwnedBy('u1')).toBe(true);
      expect(comp.isOwnedBy('u2')).toBe(false);

      const json = comp.toJSON();
      expect(json.id).toBe('cmp1');
    });

    it('validates Comparison constraints', () => {
      expect(() => new Comparison({
        id: '',
        userId: 'u1',
        documentAId: 'd1',
        documentBId: 'd2',
        documentATitle: 'A',
        documentBTitle: 'B',
        executiveSummary: 'Summary',
        addedClauses: [],
        removedClauses: [],
        modifiedClauses: [],
        changedObligations: [],
        changedFinancialTerms: [],
        changedDates: [],
        changedTermination: [],
        changedLiability: [],
        changedDisputeResolution: [],
        createdAt: now,
      })).toThrow(ValidationError);

      expect(() => new Comparison({
        id: 'c1',
        userId: '',
        documentAId: 'd1',
        documentBId: 'd2',
        documentATitle: 'A',
        documentBTitle: 'B',
        executiveSummary: 'Summary',
        addedClauses: [],
        removedClauses: [],
        modifiedClauses: [],
        changedObligations: [],
        changedFinancialTerms: [],
        changedDates: [],
        changedTermination: [],
        changedLiability: [],
        changedDisputeResolution: [],
        createdAt: now,
      })).toThrow(ValidationError);

      expect(() => new Comparison({
        id: 'c1',
        userId: 'u1',
        documentAId: '',
        documentBId: 'd2',
        documentATitle: 'A',
        documentBTitle: 'B',
        executiveSummary: 'Summary',
        addedClauses: [],
        removedClauses: [],
        modifiedClauses: [],
        changedObligations: [],
        changedFinancialTerms: [],
        changedDates: [],
        changedTermination: [],
        changedLiability: [],
        changedDisputeResolution: [],
        createdAt: now,
      })).toThrow(ValidationError);

      expect(() => new Comparison({
        id: 'c1',
        userId: 'u1',
        documentAId: 'd1',
        documentBId: 'd1',
        documentATitle: 'A',
        documentBTitle: 'A',
        executiveSummary: 'Summary',
        addedClauses: [],
        removedClauses: [],
        modifiedClauses: [],
        changedObligations: [],
        changedFinancialTerms: [],
        changedDates: [],
        changedTermination: [],
        changedLiability: [],
        changedDisputeResolution: [],
        createdAt: now,
      })).toThrow(ValidationError);

      expect(() => new Comparison({
        id: 'c1',
        userId: 'u1',
        documentAId: 'd1',
        documentBId: 'd2',
        documentATitle: 'A',
        documentBTitle: 'B',
        executiveSummary: '   ',
        addedClauses: [],
        removedClauses: [],
        modifiedClauses: [],
        changedObligations: [],
        changedFinancialTerms: [],
        changedDates: [],
        changedTermination: [],
        changedLiability: [],
        changedDisputeResolution: [],
        createdAt: now,
      })).toThrow(ValidationError);
    });
  });

  describe('ChatMessage Entity', () => {
    const now = new Date();

    it('creates and serializes ChatMessage', () => {
      const msg = new ChatMessage({
        id: 'm1',
        userId: 'u1',
        documentId: 'doc1',
        role: 'assistant',
        content: 'This is the answer',
        structuredAnswer: {
          shortAnswer: 'Yes',
          whatTheDocumentSays: 'Clause says yes',
          whyItMatters: 'Important',
          sourceCitations: [{ chunkId: 'c1', pageNumber: 1, sectionHeading: 'S1', textSnippet: 'Snippet' }],
          questionsForLawyer: ['Ask lawyer'],
          grounded: true,
        },
        createdAt: now,
      });

      expect(msg.id).toBe('m1');
      expect(msg.userId).toBe('u1');
      expect(msg.documentId).toBe('doc1');
      expect(msg.role).toBe('assistant');
      expect(msg.content).toBe('This is the answer');
      expect(msg.structuredAnswer?.shortAnswer).toBe('Yes');
      expect(msg.createdAt).toBe(now);
      expect(msg.isOwnedBy('u1')).toBe(true);

      const json = msg.toJSON();
      expect(json.id).toBe('m1');
    });

    it('validates ChatMessage fields', () => {
      expect(() => new ChatMessage({
        id: '',
        userId: 'u1',
        documentId: 'd1',
        role: 'user',
        content: 'Question',
        createdAt: now,
      })).toThrow(ValidationError);

      expect(() => new ChatMessage({
        id: 'm1',
        userId: '',
        documentId: 'd1',
        role: 'user',
        content: 'Question',
        createdAt: now,
      })).toThrow(ValidationError);

      expect(() => new ChatMessage({
        id: 'm1',
        userId: 'u1',
        documentId: '',
        role: 'user',
        content: 'Question',
        createdAt: now,
      })).toThrow(ValidationError);

      expect(() => new ChatMessage({
        id: 'm1',
        userId: 'u1',
        documentId: 'd1',
        role: 'user',
        content: '',
        createdAt: now,
      })).toThrow(ValidationError);
    });
  });

  describe('LegalBriefing Entity', () => {
    const now = new Date();

    it('creates LegalBriefing, toggles checklist items, and generates markdown', () => {
      const briefing = new LegalBriefing({
        id: 'brf1',
        userId: 'u1',
        documentId: 'doc1',
        documentTitle: 'NDA Agreement',
        conciseSummary: 'Concise summary of NDA',
        lawyerChecklist: {
          questionsToAsk: ['Is confidentiality mutual?'],
          documentsToBring: ['Signed agreement'],
          importantDeadlines: ['30 days notice'],
          keyConcerns: ['Indefinite trade secrets'],
          clarificationAreas: ['Definition of confidential info'],
        },
        actionChecklist: [
          { id: 'act_1', label: 'Verify term length', category: 'Term', completed: false },
          { id: 'act_2', label: 'Confirm exclusions', category: 'Confidentiality', completed: true },
        ],
        createdAt: now,
        updatedAt: now,
      });

      expect(briefing.id).toBe('brf1');
      expect(briefing.userId).toBe('u1');
      expect(briefing.documentId).toBe('doc1');
      expect(briefing.documentTitle).toBe('NDA Agreement');
      expect(briefing.conciseSummary).toBe('Concise summary of NDA');
      expect(briefing.isOwnedBy('u1')).toBe(true);
      expect(briefing.isOwnedBy('u2')).toBe(false);

      briefing.toggleChecklistItem('act_1');
      expect(briefing.actionChecklist.find((i) => i.id === 'act_1')?.completed).toBe(true);

      briefing.toggleChecklistItem('act_1', false);
      expect(briefing.actionChecklist.find((i) => i.id === 'act_1')?.completed).toBe(false);

      expect(() => briefing.toggleChecklistItem('unknown_id')).toThrow(ValidationError);

      const markdown = briefing.toMarkdown();
      expect(markdown).toContain('# Legal Briefing: NDA Agreement');
      expect(markdown).toContain('Questions to Ask Your Lawyer');
      expect(markdown).toContain('Action Checklist');

      const json = briefing.toJSON();
      expect(json.id).toBe('brf1');
    });

    it('validates LegalBriefing fields', () => {
      expect(() => new LegalBriefing({
        id: '',
        userId: 'u1',
        documentId: 'd1',
        documentTitle: 'Title',
        conciseSummary: 'Summary',
        lawyerChecklist: {} as any,
        actionChecklist: [],
        createdAt: now,
        updatedAt: now,
      })).toThrow(ValidationError);

      expect(() => new LegalBriefing({
        id: 'b1',
        userId: '',
        documentId: 'd1',
        documentTitle: 'Title',
        conciseSummary: 'Summary',
        lawyerChecklist: {} as any,
        actionChecklist: [],
        createdAt: now,
        updatedAt: now,
      })).toThrow(ValidationError);

      expect(() => new LegalBriefing({
        id: 'b1',
        userId: 'u1',
        documentId: '',
        documentTitle: 'Title',
        conciseSummary: 'Summary',
        lawyerChecklist: {} as any,
        actionChecklist: [],
        createdAt: now,
        updatedAt: now,
      })).toThrow(ValidationError);

      expect(() => new LegalBriefing({
        id: 'b1',
        userId: 'u1',
        documentId: 'd1',
        documentTitle: 'Title',
        conciseSummary: '',
        lawyerChecklist: {} as any,
        actionChecklist: [],
        createdAt: now,
        updatedAt: now,
      })).toThrow(ValidationError);
    });
  });
});
