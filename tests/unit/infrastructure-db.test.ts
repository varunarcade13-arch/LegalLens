import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { AppDatabase } from '../../src/infrastructure/db/Database';
import { SqliteUserRepository } from '../../src/infrastructure/db/repositories/SqliteUserRepository';
import { SqliteDocumentRepository } from '../../src/infrastructure/db/repositories/SqliteDocumentRepository';
import { SqliteAnalysisRepository } from '../../src/infrastructure/db/repositories/SqliteAnalysisRepository';
import { SqliteComparisonRepository } from '../../src/infrastructure/db/repositories/SqliteComparisonRepository';
import { SqliteChatRepository } from '../../src/infrastructure/db/repositories/SqliteChatRepository';
import { SqliteBriefingRepository } from '../../src/infrastructure/db/repositories/SqliteBriefingRepository';

import { User } from '../../src/core/domain/User';
import { LegalDocument } from '../../src/core/domain/LegalDocument';
import { DocumentAnalysis } from '../../src/core/domain/DocumentAnalysis';
import { ImportantClause } from '../../src/core/domain/ImportantClause';
import { AttentionFinding } from '../../src/core/domain/AttentionFinding';
import { Comparison } from '../../src/core/domain/Comparison';
import { ChatMessage } from '../../src/core/domain/ChatMessage';
import { LegalBriefing } from '../../src/core/domain/LegalBriefing';

describe('Infrastructure Database & Repositories', () => {
  let dbManager: AppDatabase;
  let userRepo: SqliteUserRepository;
  let docRepo: SqliteDocumentRepository;
  let analysisRepo: SqliteAnalysisRepository;
  let compRepo: SqliteComparisonRepository;
  let chatRepo: SqliteChatRepository;
  let briefingRepo: SqliteBriefingRepository;

  const testFileDbPath = path.resolve(__dirname, '../../test_data_dir/test.db');

  beforeEach(() => {
    dbManager = new AppDatabase(':memory:');
    const db = dbManager.connection;
    userRepo = new SqliteUserRepository(db);
    docRepo = new SqliteDocumentRepository(db);
    analysisRepo = new SqliteAnalysisRepository(db);
    compRepo = new SqliteComparisonRepository(db);
    chatRepo = new SqliteChatRepository(db);
    briefingRepo = new SqliteBriefingRepository(db);
  });

  afterEach(() => {
    dbManager.close();
    if (fs.existsSync(testFileDbPath)) {
      fs.unlinkSync(testFileDbPath);
      const dir = path.dirname(testFileDbPath);
      if (fs.existsSync(dir)) fs.rmdirSync(dir);
    }
  });

  it('initializes disk database and creates directories if needed', () => {
    const diskDb = new AppDatabase(testFileDbPath);
    expect(fs.existsSync(testFileDbPath)).toBe(true);
    diskDb.close();
  });

  describe('AppDatabase direct methods & branches', () => {
    it('throws error when libsql remote url is provided without auth token', () => {
      expect(() => new AppDatabase('libsql://test.turso.io')).toThrow(
        'TURSO_AUTH_TOKEN is required when using a remote Turso database URL.'
      );
    });

    it('instantiates with options object and remote url when token provided', () => {
      const db = new AppDatabase({ url: 'libsql://test.turso.io', authToken: 'token123' });
      expect(db).toBeDefined();
    });

    it('instantiates with options object dbPath', () => {
      const db = new AppDatabase({ dbPath: testFileDbPath });
      expect(db).toBeDefined();
      db.close();

      const db2 = new AppDatabase({ dbPath: `file:${testFileDbPath}` });
      expect(db2).toBeDefined();
      db2.close();

      const db3 = new AppDatabase(`file:${testFileDbPath}`);
      expect(db3).toBeDefined();
      db3.close();

      const db4 = new AppDatabase('https://example.com');
      expect(db4).toBeDefined();
      db4.close();
    });

    it('instantiates with empty string or default', () => {
      const db1 = new AppDatabase('');
      expect(db1).toBeDefined();
      db1.close();

      const db2 = new AppDatabase({});
      expect(db2).toBeDefined();
      db2.close();
    });

    it('executes direct SQL queries and statements', async () => {
      const db = new AppDatabase(':memory:');
      await db.exec('CREATE TABLE test_table (id TEXT PRIMARY KEY, value TEXT);');
      
      const runRes = await db.run('INSERT INTO test_table (id, value) VALUES (?, ?)', ['1', 'val1']);
      expect(runRes.rowsAffected).toBe(1);

      const getRes = await db.get<{ id: string; value: string }>('SELECT * FROM test_table WHERE id = ?', ['1']);
      expect(getRes?.value).toBe('val1');

      const allRes = await db.all<{ id: string; value: string }>('SELECT * FROM test_table');
      expect(allRes).toHaveLength(1);

      const execRes = await db.execute({ sql: 'SELECT * FROM test_table WHERE id = ?', args: ['1'] });
      expect(execRes.rows).toHaveLength(1);

      const execResStr = await db.execute('SELECT * FROM test_table');
      expect(execResStr.rows).toHaveLength(1);

      const execResNamed = await db.execute({ sql: 'SELECT * FROM test_table WHERE id = :id', args: { id: '1', extra: undefined } as any });
      expect(execResNamed.rows).toHaveLength(1);

      // batch
      await db.batch([]);
      await db.batch([
        'INSERT INTO test_table (id, value) VALUES (\'2\', \'val2\')',
        { sql: 'INSERT INTO test_table (id, value) VALUES (?, ?)', args: ['3', 'val3'] }
      ]);
      const count = await db.all('SELECT * FROM test_table');
      expect(count).toHaveLength(3);

      // prepare
      const stmt = db.prepare('SELECT * FROM test_table WHERE id = ?');
      const prepGet = await stmt.get<{ id: string }>('2');
      expect(prepGet?.id).toBe('2');
      const prepAll = await stmt.all('2');
      expect(prepAll).toHaveLength(1);
      const prepRunStmt = db.prepare('DELETE FROM test_table WHERE id = ?');
      const prepRun = await prepRunStmt.run('2');
      expect(prepRun.rowsAffected).toBe(1);

      await db.close();
    });
  });

  describe('SqliteUserRepository', () => {
    it('creates, finds by id and email, updates, and deletes users', async () => {
      const now = new Date();
      const user = new User({
        id: 'u1',
        email: 'user1@example.com',
        passwordHash: 'hash_pw',
        name: 'User One',
        createdAt: now,
        updatedAt: now,
      });

      await userRepo.create(user);

      const byId = await userRepo.findById('u1');
      expect(byId?.email).toBe('user1@example.com');

      const byEmail = await userRepo.findByEmail('USER1@EXAMPLE.COM');
      expect(byEmail?.id).toBe('u1');

      expect(await userRepo.findById('missing')).toBeNull();
      expect(await userRepo.findByEmail('missing@example.com')).toBeNull();

      user.updateProfile('User One Updated');
      await userRepo.update(user);
      const updated = await userRepo.findById('u1');
      expect(updated?.name).toBe('User One Updated');

      await userRepo.delete('u1');
      expect(await userRepo.findById('u1')).toBeNull();
    });
  });

  describe('SqliteDocumentRepository', () => {
    it('handles document CRUD and counts by user', async () => {
      const now = new Date();
      const user = new User({ id: 'u1', email: 'u@e.com', passwordHash: 'h', name: 'U', createdAt: now, updatedAt: now });
      await userRepo.create(user);

      const doc = new LegalDocument({
        id: 'd1', userId: 'u1', title: 'Doc Title', originalFilename: 'doc.txt', mimeType: 'text/plain',
        fileSizeBytes: 100, storagePath: 'path/d1.txt', pageCount: 1, characterCount: 50, status: 'pending',
        errorMessage: null, createdAt: now, updatedAt: now,
      });

      await docRepo.create(doc);
      expect(await docRepo.countByUserId('u1')).toBe(1);

      const byId = await docRepo.findById('d1');
      expect(byId?.title).toBe('Doc Title');
      expect(byId?.status).toBe('pending');

      expect(await docRepo.findById('missing')).toBeNull();

      doc.markReady(3, 1500);
      await docRepo.update(doc);
      const updated = await docRepo.findById('d1');
      expect(updated?.status).toBe('ready');
      expect(updated?.pageCount).toBe(3);

      const userDocs = await docRepo.findByUserId('u1');
      expect(userDocs).toHaveLength(1);

      await docRepo.delete('d1');
      expect(await docRepo.findById('d1')).toBeNull();
      expect(await docRepo.countByUserId('u1')).toBe(0);
    });
  });

  describe('SqliteAnalysisRepository', () => {
    it('saves analysis with clauses and findings, retrieves by doc id, and deletes', async () => {
      const now = new Date();
      const user = new User({ id: 'u1', email: 'u@e.com', passwordHash: 'h', name: 'U', createdAt: now, updatedAt: now });
      await userRepo.create(user);
      const doc = new LegalDocument({
        id: 'd1', userId: 'u1', title: 'Doc', originalFilename: 'd.txt', mimeType: 'text/plain',
        fileSizeBytes: 10, storagePath: 'p', pageCount: 1, characterCount: 10, status: 'ready', createdAt: now, updatedAt: now,
      });
      await docRepo.create(doc);

      const clause = new ImportantClause({
        id: 'cls1', documentId: 'd1', category: 'liability', title: 'Liability Cap',
        originalText: 'Liability shall not exceed $1000', plainExplanation: 'Liability capped at $1000',
        whyItMatters: 'Limits payout', concernLevel: 'review_carefully', pageNumber: 1, sectionHeading: 'Sec 1',
      });

      const finding = new AttentionFinding({
        id: 'fnd1', documentId: 'd1', category: 'high_attention', finding: 'Short notice',
        whyItMatters: 'Less time to react', sourceReference: 'Page 1, Sec 2', pageNumber: 1,
        sectionHeading: 'Sec 2', questionsToConsider: ['Can notice be extended?'],
        suggestedProfessionalFollowUp: 'Ask lawyer',
      });

      const analysis = new DocumentAnalysis({
        id: 'anl1', documentId: 'd1', documentType: 'Services Agreement', partiesInvolved: ['A', 'B'],
        effectiveDate: '2025-01-01', expirationDate: '2026-01-01', jurisdiction: 'NY',
        highLevelSummary: 'Summary text',
        plainLanguageSummary: {
          whatThisDocumentIsAbout: 'Services',
          whatYouAreAgreeingTo: ['Provide services'],
          whatTheOtherPartyIsAgreeingTo: ['Pay'],
          yourKeyResponsibilities: ['Deliver'],
          yourRights: ['Payment'],
          importantDates: ['Jan 1'],
          financialObligations: ['None'],
          terminationConditions: ['30 days'],
        },
        extractedFacts: [{ category: 'Jurisdiction', fact: 'NY', verbatimExcerpt: 'State of NY', pageNumber: 1 }],
        clauses: [clause],
        findings: [finding],
        createdAt: now,
        updatedAt: now,
      });

      await analysisRepo.save(analysis);

      const retrieved = await analysisRepo.findByDocumentId('d1');
      expect(retrieved?.id).toBe('anl1');
      expect(retrieved?.clauses).toHaveLength(1);
      expect(retrieved?.clauses[0].title).toBe('Liability Cap');
      expect(retrieved?.findings).toHaveLength(1);
      expect(retrieved?.findings[0].finding).toBe('Short notice');

      expect(await analysisRepo.findByDocumentId('missing')).toBeNull();

      // Test resave / update transaction
      await analysisRepo.save(analysis);

      await analysisRepo.deleteByDocumentId('d1');
      expect(await analysisRepo.findByDocumentId('d1')).toBeNull();
    });
  });

  describe('SqliteComparisonRepository', () => {
    it('saves and retrieves comparisons with all clause diff categories', async () => {
      const now = new Date();
      const user = new User({ id: 'u1', email: 'u@e.com', passwordHash: 'h', name: 'U', createdAt: now, updatedAt: now });
      await userRepo.create(user);
      const docA = new LegalDocument({
        id: 'dA', userId: 'u1', title: 'Doc A', originalFilename: 'dA.txt', mimeType: 'text/plain',
        fileSizeBytes: 10, storagePath: 'p', pageCount: 1, characterCount: 10, status: 'ready', createdAt: now, updatedAt: now,
      });
      const docB = new LegalDocument({
        id: 'dB', userId: 'u1', title: 'Doc B', originalFilename: 'dB.txt', mimeType: 'text/plain',
        fileSizeBytes: 10, storagePath: 'p', pageCount: 1, characterCount: 10, status: 'ready', createdAt: now, updatedAt: now,
      });
      await docRepo.create(docA);
      await docRepo.create(docB);

      const diff = {
        category: 'Termination',
        documentA: '30 days',
        documentB: '60 days',
        difference: 'Extended notice',
        whyItMatters: 'More time',
        impactLevel: 'moderate' as const,
      };

      const comparison = new Comparison({
        id: 'cmp1', userId: 'u1', documentAId: 'dA', documentBId: 'dB', documentATitle: 'Doc A', documentBTitle: 'Doc B',
        executiveSummary: 'Comparison summary', addedClauses: [diff], removedClauses: [], modifiedClauses: [],
        changedObligations: [], changedFinancialTerms: [], changedDates: [], changedTermination: [diff],
        changedLiability: [], changedDisputeResolution: [], createdAt: now,
      });

      await compRepo.save(comparison);

      const byId = await compRepo.findById('cmp1');
      expect(byId?.id).toBe('cmp1');
      expect(byId?.addedClauses).toHaveLength(1);
      expect(byId?.changedTermination).toHaveLength(1);

      expect(await compRepo.findById('missing')).toBeNull();

      const byUser = await compRepo.findByUserId('u1');
      expect(byUser).toHaveLength(1);

      await compRepo.delete('cmp1');
      expect(await compRepo.findById('cmp1')).toBeNull();
    });
  });

  describe('SqliteChatRepository', () => {
    it('saves and clears chat messages', async () => {
      const now = new Date();
      const user = new User({ id: 'u1', email: 'u@e.com', passwordHash: 'h', name: 'U', createdAt: now, updatedAt: now });
      await userRepo.create(user);
      const doc = new LegalDocument({
        id: 'd1', userId: 'u1', title: 'Doc', originalFilename: 'd.txt', mimeType: 'text/plain',
        fileSizeBytes: 10, storagePath: 'p', pageCount: 1, characterCount: 10, status: 'ready', createdAt: now, updatedAt: now,
      });
      await docRepo.create(doc);

      const userMsg = new ChatMessage({
        id: 'm1', userId: 'u1', documentId: 'd1', role: 'user', content: 'What is the notice period?', createdAt: now,
      });
      const assistantMsg = new ChatMessage({
        id: 'm2', userId: 'u1', documentId: 'd1', role: 'assistant', content: 'Notice is 30 days',
        structuredAnswer: {
          shortAnswer: '30 days', whatTheDocumentSays: 'Clause 2 says 30 days', whyItMatters: 'Must notify early',
          sourceCitations: [{ chunkId: 'c1', pageNumber: 1, sectionHeading: 'Notice', textSnippet: '30 days notice' }],
          questionsForLawyer: ['Can this be shortened?'], grounded: true,
        },
        createdAt: new Date(now.getTime() + 1000),
      });

      await chatRepo.saveMessage(userMsg);
      await chatRepo.saveMessage(assistantMsg);

      const messages = await chatRepo.getMessages('d1', 'u1');
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[1].structuredAnswer?.shortAnswer).toBe('30 days');

      await chatRepo.clearMessages('d1', 'u1');
      expect(await chatRepo.getMessages('d1', 'u1')).toHaveLength(0);
    });
  });

  describe('SqliteBriefingRepository', () => {
    it('saves, updates, and deletes legal briefings', async () => {
      const now = new Date();
      const user = new User({ id: 'u1', email: 'u@e.com', passwordHash: 'h', name: 'U', createdAt: now, updatedAt: now });
      await userRepo.create(user);
      const doc = new LegalDocument({
        id: 'd1', userId: 'u1', title: 'Doc', originalFilename: 'd.txt', mimeType: 'text/plain',
        fileSizeBytes: 10, storagePath: 'p', pageCount: 1, characterCount: 10, status: 'ready', createdAt: now, updatedAt: now,
      });
      await docRepo.create(doc);

      const briefing = new LegalBriefing({
        id: 'b1', userId: 'u1', documentId: 'd1', documentTitle: 'Doc Title',
        conciseSummary: 'Briefing summary',
        lawyerChecklist: {
          questionsToAsk: ['Is liability fair?'],
          documentsToBring: ['Signed agreement'],
          importantDeadlines: ['30 days'],
          keyConcerns: ['Caps'],
          clarificationAreas: ['IP'],
        },
        actionChecklist: [
          { id: 'i1', label: 'Check termination', category: 'Termination', completed: false },
        ],
        createdAt: now,
        updatedAt: now,
      });

      await briefingRepo.save(briefing);

      const retrieved = await briefingRepo.findByDocumentId('d1');
      expect(retrieved?.id).toBe('b1');
      expect(retrieved?.actionChecklist).toHaveLength(1);

      expect(await briefingRepo.findByDocumentId('missing')).toBeNull();

      // Update checklist
      briefing.toggleChecklistItem('i1', true);
      await briefingRepo.update(briefing);
      const updated = await briefingRepo.findByDocumentId('d1');
      expect(updated?.actionChecklist[0].completed).toBe(true);

      // On conflict upsert
      await briefingRepo.save(briefing);

      await briefingRepo.delete('d1');
      expect(await briefingRepo.findByDocumentId('d1')).toBeNull();
    });
  });
});
