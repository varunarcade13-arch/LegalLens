import { Database as SqliteDb } from 'better-sqlite3';
import { LegalDocument, DocumentStatus } from '../../../core/domain/LegalDocument';
import { IDocumentRepository } from '../../../core/ports';

interface DocumentRow {
  id: string;
  user_id: string;
  title: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  storage_path: string;
  page_count: number;
  character_count: number;
  status: DocumentStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export class SqliteDocumentRepository implements IDocumentRepository {
  constructor(private db: SqliteDb) {}

  public async create(doc: LegalDocument): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO documents (
        id, user_id, title, original_filename, mime_type, file_size_bytes,
        storage_path, page_count, character_count, status, error_message,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      doc.id,
      doc.userId,
      doc.title,
      doc.originalFilename,
      doc.mimeType,
      doc.fileSizeBytes,
      doc.storagePath,
      doc.pageCount,
      doc.characterCount,
      doc.status,
      doc.errorMessage,
      doc.createdAt.toISOString(),
      doc.updatedAt.toISOString()
    );
  }

  public async findById(id: string): Promise<LegalDocument | null> {
    const stmt = this.db.prepare(`SELECT * FROM documents WHERE id = ?`);
    const row = stmt.get(id) as DocumentRow | undefined;
    if (!row) return null;
    return this.mapToDomain(row);
  }

  public async findByUserId(userId: string): Promise<LegalDocument[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC
    `);
    const rows = stmt.all(userId) as DocumentRow[];
    return rows.map((r) => this.mapToDomain(r));
  }

  public async update(doc: LegalDocument): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE documents
      SET title = ?, status = ?, page_count = ?, character_count = ?,
          error_message = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(
      doc.title,
      doc.status,
      doc.pageCount,
      doc.characterCount,
      doc.errorMessage,
      doc.updatedAt.toISOString(),
      doc.id
    );
  }

  public async delete(id: string): Promise<void> {
    const stmt = this.db.prepare(`DELETE FROM documents WHERE id = ?`);
    stmt.run(id);
  }

  public async countByUserId(userId: string): Promise<number> {
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM documents WHERE user_id = ?`);
    const res = stmt.get(userId) as { count: number };
    return res ? res.count : 0;
  }

  private mapToDomain(row: DocumentRow): LegalDocument {
    return new LegalDocument({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      originalFilename: row.original_filename,
      mimeType: row.mime_type,
      fileSizeBytes: row.file_size_bytes,
      storagePath: row.storage_path,
      pageCount: row.page_count,
      characterCount: row.character_count,
      status: row.status,
      errorMessage: row.error_message,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}
