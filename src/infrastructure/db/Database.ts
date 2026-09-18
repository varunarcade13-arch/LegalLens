import { createClient, Client, InStatement } from '@libsql/client';
import path from 'path';
import fs from 'fs';

export interface IPreparedStatement {
  run(...args: any[]): Promise<{ rowsAffected: number }>;
  get<T = any>(...args: any[]): Promise<T | null>;
  all<T = any>(...args: any[]): Promise<T[]>;
}

export interface IDatabaseClient {
  execute(statement: string | InStatement): Promise<{ rowsAffected: number; rows: any[] }>;
  get<T = any>(sql: string, args?: any[]): Promise<T | null>;
  all<T = any>(sql: string, args?: any[]): Promise<T[]>;
  run(sql: string, args?: any[]): Promise<{ rowsAffected: number }>;
  batch(statements: (string | InStatement)[]): Promise<void>;
  exec(sqlScript: string): Promise<void>;
  prepare(sql: string): IPreparedStatement;
  close(): Promise<void> | void;
}

export interface AppDatabaseOptions {
  url?: string;
  authToken?: string;
  dbPath?: string;
}

function sanitizeArg(val: any): any {
  if (val === undefined) return null;
  return val;
}

function sanitizeArgs(args?: any): any {
  if (!args) return [];
  if (Array.isArray(args)) {
    return args.map(sanitizeArg);
  }
  const sanitizedObj: Record<string, any> = {};
  for (const [k, v] of Object.entries(args)) {
    sanitizedObj[k] = sanitizeArg(v);
  }
  return sanitizedObj;
}

export class AppDatabase implements IDatabaseClient {
  private client: Client;
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor(optionsOrPath?: string | AppDatabaseOptions) {
    let url: string;
    let authToken: string | undefined;

    if (typeof optionsOrPath === 'string') {
      if (optionsOrPath === ':memory:' || optionsOrPath === '') {
        url = 'file::memory:';
      } else if (
        optionsOrPath.startsWith('libsql://') ||
        optionsOrPath.startsWith('https://') ||
        optionsOrPath.startsWith('http://')
      ) {
        url = optionsOrPath;
      } else {
        url = optionsOrPath.startsWith('file:') ? optionsOrPath : `file:${optionsOrPath}`;
      }
    } else {
      url =
        optionsOrPath?.url ||
        process.env.TURSO_DATABASE_URL ||
        (optionsOrPath?.dbPath
          ? optionsOrPath.dbPath.startsWith('file:')
            ? optionsOrPath.dbPath
            : `file:${optionsOrPath.dbPath}`
          : 'file::memory:');
      authToken = optionsOrPath?.authToken || process.env.TURSO_AUTH_TOKEN;
    }

    if (url.startsWith('libsql://') && !authToken) {
      throw new Error('TURSO_AUTH_TOKEN is required when using a remote Turso database URL.');
    }

    if (url.startsWith('file:') && url !== 'file::memory:') {
      const filePath = url.replace(/^file:/, '');
      const dir = path.dirname(filePath);
      if (dir && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.client = createClient({
      url,
      authToken,
    });
  }

  public get connection(): IDatabaseClient {
    return this;
  }

  public async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;
    if (!this.initPromise) {
      this.initPromise = (async () => {
        await this.initPragmas();
        await this.initSchema();
        this.isInitialized = true;
      })();
    }
    await this.initPromise;
  }

  public async execute(statement: string | InStatement): Promise<{ rowsAffected: number; rows: any[] }> {
    await this.ensureInitialized();
    let sanitizedStatement: InStatement;
    if (typeof statement === 'string') {
      sanitizedStatement = { sql: statement, args: [] };
    } else {
      sanitizedStatement = { sql: statement.sql, args: sanitizeArgs(statement.args) };
    }
    const res = await this.client.execute(sanitizedStatement);
    return {
      rowsAffected: res.rowsAffected,
      rows: res.rows as any[],
    };
  }

  public async get<T = any>(sql: string, args?: any[]): Promise<T | null> {
    await this.ensureInitialized();
    const res = await this.client.execute({ sql, args: sanitizeArgs(args) });
    if (res.rows.length === 0) return null;
    return res.rows[0] as unknown as T;
  }

  public async all<T = any>(sql: string, args?: any[]): Promise<T[]> {
    await this.ensureInitialized();
    const res = await this.client.execute({ sql, args: sanitizeArgs(args) });
    return res.rows as unknown as T[];
  }

  public async run(sql: string, args?: any[]): Promise<{ rowsAffected: number }> {
    await this.ensureInitialized();
    const res = await this.client.execute({ sql, args: sanitizeArgs(args) });
    return { rowsAffected: res.rowsAffected };
  }

  public async batch(statements: (string | InStatement)[]): Promise<void> {
    await this.ensureInitialized();
    if (!statements || statements.length === 0) return;
    const sanitized = statements.map((s) =>
      typeof s === 'string'
        ? ({ sql: s, args: [] } as InStatement)
        : ({ sql: s.sql, args: sanitizeArgs(s.args) } as InStatement)
    );
    await this.client.batch(sanitized, 'write');
  }

  public async exec(sqlScript: string): Promise<void> {
    await this.client.executeMultiple(sqlScript);
  }

  public prepare(sql: string): IPreparedStatement {
    return {
      run: async (...args: any[]) => this.run(sql, args),
      get: async <T = any>(...args: any[]) => this.get<T>(sql, args),
      all: async <T = any>(...args: any[]) => this.all<T>(sql, args),
    };
  }

  public async close(): Promise<void> {
    this.client.close();
  }

  private async initPragmas(): Promise<void> {
    await this.client.execute('PRAGMA foreign_keys = ON;');
  }

  private async initSchema(): Promise<void> {
    await this.client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_size_bytes INTEGER NOT NULL,
        storage_path TEXT NOT NULL,
        page_count INTEGER NOT NULL,
        character_count INTEGER NOT NULL,
        status TEXT NOT NULL,
        error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
      CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

      CREATE TABLE IF NOT EXISTS document_chunks (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        chunk_index INTEGER NOT NULL,
        page_number INTEGER NOT NULL,
        section_heading TEXT NOT NULL,
        content TEXT NOT NULL,
        token_count INTEGER NOT NULL,
        embedding TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON document_chunks(document_id);

      CREATE TABLE IF NOT EXISTS analyses (
        id TEXT PRIMARY KEY,
        document_id TEXT UNIQUE NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        document_type TEXT NOT NULL,
        parties_involved TEXT NOT NULL,
        effective_date TEXT,
        expiration_date TEXT,
        jurisdiction TEXT,
        high_level_summary TEXT NOT NULL,
        plain_language_summary TEXT NOT NULL,
        extracted_facts TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS important_clauses (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        original_text TEXT NOT NULL,
        plain_explanation TEXT NOT NULL,
        why_it_matters TEXT NOT NULL,
        concern_level TEXT NOT NULL,
        page_number INTEGER NOT NULL,
        section_heading TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_clauses_document_id ON important_clauses(document_id);

      CREATE TABLE IF NOT EXISTS attention_findings (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        finding TEXT NOT NULL,
        why_it_matters TEXT NOT NULL,
        source_reference TEXT NOT NULL,
        page_number INTEGER NOT NULL,
        section_heading TEXT NOT NULL,
        questions_to_consider TEXT NOT NULL,
        suggested_professional_follow_up TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_findings_document_id ON attention_findings(document_id);

      CREATE TABLE IF NOT EXISTS comparisons (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        document_a_id TEXT NOT NULL,
        document_b_id TEXT NOT NULL,
        document_a_title TEXT NOT NULL,
        document_b_title TEXT NOT NULL,
        executive_summary TEXT NOT NULL,
        added_clauses TEXT NOT NULL,
        removed_clauses TEXT NOT NULL,
        modified_clauses TEXT NOT NULL,
        changed_obligations TEXT NOT NULL,
        changed_financial_terms TEXT NOT NULL,
        changed_dates TEXT NOT NULL,
        changed_termination TEXT NOT NULL,
        changed_liability TEXT NOT NULL,
        changed_dispute_resolution TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_comparisons_user_id ON comparisons(user_id);

      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        structured_answer TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_chat_messages_doc_user ON chat_messages(document_id, user_id);

      CREATE TABLE IF NOT EXISTS legal_briefings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        document_id TEXT UNIQUE NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        document_title TEXT NOT NULL,
        concise_summary TEXT NOT NULL,
        lawyer_checklist TEXT NOT NULL,
        action_checklist TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_briefings_document_id ON legal_briefings(document_id);
    `);
  }
}
