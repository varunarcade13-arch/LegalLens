import { Database as SqliteDb } from 'better-sqlite3';
import { Comparison, ClauseDifference } from '../../../core/domain/Comparison';
import { IComparisonRepository } from '../../../core/ports';

interface ComparisonRow {
  id: string;
  user_id: string;
  document_a_id: string;
  document_b_id: string;
  document_a_title: string;
  document_b_title: string;
  executive_summary: string;
  added_clauses: string;
  removed_clauses: string;
  modified_clauses: string;
  changed_obligations: string;
  changed_financial_terms: string;
  changed_dates: string;
  changed_termination: string;
  changed_liability: string;
  changed_dispute_resolution: string;
  created_at: string;
}

export class SqliteComparisonRepository implements IComparisonRepository {
  constructor(private db: SqliteDb) {}

  public async save(comparison: Comparison): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO comparisons (
        id, user_id, document_a_id, document_b_id, document_a_title,
        document_b_title, executive_summary, added_clauses, removed_clauses,
        modified_clauses, changed_obligations, changed_financial_terms,
        changed_dates, changed_termination, changed_liability,
        changed_dispute_resolution, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      comparison.id,
      comparison.userId,
      comparison.documentAId,
      comparison.documentBId,
      comparison.documentATitle,
      comparison.documentBTitle,
      comparison.executiveSummary,
      JSON.stringify(comparison.addedClauses),
      JSON.stringify(comparison.removedClauses),
      JSON.stringify(comparison.modifiedClauses),
      JSON.stringify(comparison.changedObligations),
      JSON.stringify(comparison.changedFinancialTerms),
      JSON.stringify(comparison.changedDates),
      JSON.stringify(comparison.changedTermination),
      JSON.stringify(comparison.changedLiability),
      JSON.stringify(comparison.changedDisputeResolution),
      comparison.createdAt.toISOString()
    );
  }

  public async findById(id: string): Promise<Comparison | null> {
    const stmt = this.db.prepare(`SELECT * FROM comparisons WHERE id = ?`);
    const row = stmt.get(id) as ComparisonRow | undefined;
    if (!row) return null;
    return this.mapToDomain(row);
  }

  public async findByUserId(userId: string): Promise<Comparison[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM comparisons WHERE user_id = ? ORDER BY created_at DESC
    `);
    const rows = stmt.all(userId) as ComparisonRow[];
    return rows.map((r) => this.mapToDomain(r));
  }

  public async delete(id: string): Promise<void> {
    const stmt = this.db.prepare(`DELETE FROM comparisons WHERE id = ?`);
    stmt.run(id);
  }

  private mapToDomain(row: ComparisonRow): Comparison {
    return new Comparison({
      id: row.id,
      userId: row.user_id,
      documentAId: row.document_a_id,
      documentBId: row.document_b_id,
      documentATitle: row.document_a_title,
      documentBTitle: row.document_b_title,
      executiveSummary: row.executive_summary,
      addedClauses: JSON.parse(row.added_clauses || '[]') as ClauseDifference[],
      removedClauses: JSON.parse(row.removed_clauses || '[]') as ClauseDifference[],
      modifiedClauses: JSON.parse(row.modified_clauses || '[]') as ClauseDifference[],
      changedObligations: JSON.parse(row.changed_obligations || '[]') as ClauseDifference[],
      changedFinancialTerms: JSON.parse(row.changed_financial_terms || '[]') as ClauseDifference[],
      changedDates: JSON.parse(row.changed_dates || '[]') as ClauseDifference[],
      changedTermination: JSON.parse(row.changed_termination || '[]') as ClauseDifference[],
      changedLiability: JSON.parse(row.changed_liability || '[]') as ClauseDifference[],
      changedDisputeResolution: JSON.parse(row.changed_dispute_resolution || '[]') as ClauseDifference[],
      createdAt: new Date(row.created_at),
    });
  }
}
