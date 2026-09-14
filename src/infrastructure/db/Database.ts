import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export class AppDatabase {
  private db: Database.Database;

  constructor(dbPath: string = ':memory:') {
    if (dbPath !== ':memory:') {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new Database(dbPath);
    this.initPragmas();
    this.initSchema();
  }

  public get connection(): Database.Database {
    return this.db;
  }

  public close(): void {
    this.db.close();
  }

  private initPragmas(): void {
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');
  }

  private initSchema(): void {
    this.db.exec(`
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
