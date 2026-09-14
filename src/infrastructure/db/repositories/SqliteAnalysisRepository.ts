import { Database as SqliteDb } from 'better-sqlite3';
import { DocumentAnalysis, ExtractedFact, PlainLanguageSummary } from '../../../core/domain/DocumentAnalysis';
import { ImportantClause, ClauseCategory, ConcernLevel } from '../../../core/domain/ImportantClause';
import { AttentionFinding } from '../../../core/domain/AttentionFinding';
import { IAnalysisRepository } from '../../../core/ports';

interface AnalysisRow {
  id: string;
  document_id: string;
  document_type: string;
  parties_involved: string;
  effective_date: string | null;
  expiration_date: string | null;
  jurisdiction: string | null;
  high_level_summary: string;
  plain_language_summary: string;
  extracted_facts: string;
  created_at: string;
  updated_at: string;
}

interface ClauseRow {
  id: string;
  document_id: string;
  category: string;
  title: string;
  original_text: string;
  plain_explanation: string;
  why_it_matters: string;
  concern_level: string;
  page_number: number;
  section_heading: string;
}

interface FindingRow {
  id: string;
  document_id: string;
  category: string;
  finding: string;
  why_it_matters: string;
  source_reference: string;
  page_number: number;
  section_heading: string;
  questions_to_consider: string;
  suggested_professional_follow_up: string;
}

export class SqliteAnalysisRepository implements IAnalysisRepository {
  constructor(private db: SqliteDb) {}

  public async save(analysis: DocumentAnalysis): Promise<void> {
    const saveTransaction = this.db.transaction(() => {
      // Clean up previous analysis if exists
      this.db.prepare(`DELETE FROM analyses WHERE document_id = ?`).run(analysis.documentId);
      this.db.prepare(`DELETE FROM important_clauses WHERE document_id = ?`).run(analysis.documentId);
      this.db.prepare(`DELETE FROM attention_findings WHERE document_id = ?`).run(analysis.documentId);

      const stmtAnalysis = this.db.prepare(`
        INSERT INTO analyses (
          id, document_id, document_type, parties_involved, effective_date,
          expiration_date, jurisdiction, high_level_summary,
          plain_language_summary, extracted_facts, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmtAnalysis.run(
        analysis.id,
        analysis.documentId,
        analysis.documentType,
        JSON.stringify(analysis.partiesInvolved),
        analysis.effectiveDate,
        analysis.expirationDate,
        analysis.jurisdiction,
        analysis.highLevelSummary,
        JSON.stringify(analysis.plainLanguageSummary),
        JSON.stringify(analysis.extractedFacts),
        analysis.createdAt.toISOString(),
        analysis.updatedAt.toISOString()
      );

      const stmtClause = this.db.prepare(`
        INSERT INTO important_clauses (
          id, document_id, category, title, original_text,
          plain_explanation, why_it_matters, concern_level,
          page_number, section_heading
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const clause of analysis.clauses) {
        stmtClause.run(
          clause.id,
          clause.documentId,
          clause.category,
          clause.title,
          clause.originalText,
          clause.plainExplanation,
          clause.whyItMatters,
          clause.concernLevel,
          clause.pageNumber,
          clause.sectionHeading
        );
      }

      const stmtFinding = this.db.prepare(`
        INSERT INTO attention_findings (
          id, document_id, category, finding, why_it_matters,
          source_reference, page_number, section_heading,
          questions_to_consider, suggested_professional_follow_up
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const finding of analysis.findings) {
        stmtFinding.run(
          finding.id,
          finding.documentId,
          finding.category,
          finding.finding,
          finding.whyItMatters,
          finding.sourceReference,
          finding.pageNumber,
          finding.sectionHeading,
          JSON.stringify(finding.questionsToConsider),
          finding.suggestedProfessionalFollowUp
        );
      }
    });

    saveTransaction();
  }

  public async findByDocumentId(documentId: string): Promise<DocumentAnalysis | null> {
    const stmt = this.db.prepare(`SELECT * FROM analyses WHERE document_id = ?`);
    const row = stmt.get(documentId) as AnalysisRow | undefined;
    if (!row) return null;

    const clauseRows = this.db
      .prepare(`SELECT * FROM important_clauses WHERE document_id = ?`)
      .all(documentId) as ClauseRow[];

    const clauses = clauseRows.map(
      (c) =>
        new ImportantClause({
          id: c.id,
          documentId: c.document_id,
          category: c.category as ClauseCategory,
          title: c.title,
          originalText: c.original_text,
          plainExplanation: c.plain_explanation,
          whyItMatters: c.why_it_matters,
          concernLevel: c.concern_level as ConcernLevel,
          pageNumber: c.page_number,
          sectionHeading: c.section_heading,
        })
    );

    const findingRows = this.db
      .prepare(`SELECT * FROM attention_findings WHERE document_id = ?`)
      .all(documentId) as FindingRow[];

    const findings = findingRows.map(
      (f) =>
        new AttentionFinding({
          id: f.id,
          documentId: f.document_id,
          category: f.category as ConcernLevel,
          finding: f.finding,
          whyItMatters: f.why_it_matters,
          sourceReference: f.source_reference,
          pageNumber: f.page_number,
          sectionHeading: f.section_heading,
          questionsToConsider: JSON.parse(f.questions_to_consider || '[]'),
          suggestedProfessionalFollowUp: f.suggested_professional_follow_up,
        })
    );

    return new DocumentAnalysis({
      id: row.id,
      documentId: row.document_id,
      documentType: row.document_type,
      partiesInvolved: JSON.parse(row.parties_involved || '[]'),
      effectiveDate: row.effective_date,
      expirationDate: row.expiration_date,
      jurisdiction: row.jurisdiction,
      highLevelSummary: row.high_level_summary,
      plainLanguageSummary: JSON.parse(row.plain_language_summary) as PlainLanguageSummary,
      extractedFacts: JSON.parse(row.extracted_facts || '[]') as ExtractedFact[],
      clauses,
      findings,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  public async deleteByDocumentId(documentId: string): Promise<void> {
    const deleteTransaction = this.db.transaction(() => {
      this.db.prepare(`DELETE FROM attention_findings WHERE document_id = ?`).run(documentId);
      this.db.prepare(`DELETE FROM important_clauses WHERE document_id = ?`).run(documentId);
      this.db.prepare(`DELETE FROM analyses WHERE document_id = ?`).run(documentId);
    });
    deleteTransaction();
  }
}
