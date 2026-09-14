import { Database as SqliteDb } from 'better-sqlite3';
import { LegalBriefing, LawyerChecklist, ActionChecklistItem } from '../../../core/domain/LegalBriefing';
import { IBriefingRepository } from '../../../core/ports';

interface BriefingRow {
  id: string;
  user_id: string;
  document_id: string;
  document_title: string;
  concise_summary: string;
  lawyer_checklist: string;
  action_checklist: string;
  created_at: string;
  updated_at: string;
}

export class SqliteBriefingRepository implements IBriefingRepository {
  constructor(private db: SqliteDb) {}

  public async save(briefing: LegalBriefing): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO legal_briefings (
        id, user_id, document_id, document_title, concise_summary,
        lawyer_checklist, action_checklist, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(document_id) DO UPDATE SET
        document_title = excluded.document_title,
        concise_summary = excluded.concise_summary,
        lawyer_checklist = excluded.lawyer_checklist,
        action_checklist = excluded.action_checklist,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      briefing.id,
      briefing.userId,
      briefing.documentId,
      briefing.documentTitle,
      briefing.conciseSummary,
      JSON.stringify(briefing.lawyerChecklist),
      JSON.stringify(briefing.actionChecklist),
      briefing.createdAt.toISOString(),
      briefing.updatedAt.toISOString()
    );
  }

  public async findByDocumentId(documentId: string): Promise<LegalBriefing | null> {
    const stmt = this.db.prepare(`SELECT * FROM legal_briefings WHERE document_id = ?`);
    const row = stmt.get(documentId) as BriefingRow | undefined;
    if (!row) return null;
    return this.mapToDomain(row);
  }

  public async update(briefing: LegalBriefing): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE legal_briefings
      SET action_checklist = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(
      JSON.stringify(briefing.actionChecklist),
      briefing.updatedAt.toISOString(),
      briefing.id
    );
  }

  public async delete(documentId: string): Promise<void> {
    const stmt = this.db.prepare(`DELETE FROM legal_briefings WHERE document_id = ?`);
    stmt.run(documentId);
  }

  private mapToDomain(row: BriefingRow): LegalBriefing {
    return new LegalBriefing({
      id: row.id,
      userId: row.user_id,
      documentId: row.document_id,
      documentTitle: row.document_title,
      conciseSummary: row.concise_summary,
      lawyerChecklist: JSON.parse(row.lawyer_checklist || '{}') as LawyerChecklist,
      actionChecklist: JSON.parse(row.action_checklist || '[]') as ActionChecklistItem[],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}
