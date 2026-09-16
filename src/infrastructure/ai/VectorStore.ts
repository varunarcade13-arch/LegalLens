import { Database as SqliteDb } from 'better-sqlite3';
import { DocumentChunk } from '../../core/domain/DocumentChunk';
import { IVectorStore, VectorSearchResult } from '../../core/ports';

interface ChunkRow {
  id: string;
  document_id: string;
  chunk_index: number;
  page_number: number;
  section_heading: string;
  content: string;
  token_count: number;
  embedding: string | null;
}

export class VectorStore implements IVectorStore {
  constructor(private db: SqliteDb) {}

  public async upsertChunks(chunks: DocumentChunk[]): Promise<void> {
    const insertTransaction = this.db.transaction(() => {
      const stmt = this.db.prepare(`
        INSERT INTO document_chunks (
          id, document_id, chunk_index, page_number, section_heading,
          content, token_count, embedding
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          content = excluded.content,
          embedding = excluded.embedding
      `);

      for (const chunk of chunks) {
        stmt.run(
          chunk.id,
          chunk.documentId,
          chunk.chunkIndex,
          chunk.pageNumber,
          chunk.sectionHeading,
          chunk.content,
          chunk.tokenCount,
          chunk.embedding ? JSON.stringify(chunk.embedding) : null
        );
      }
    });

    insertTransaction();
  }

  public async searchSimilar(
    documentId: string,
    queryEmbedding: number[],
    topK: number = 4
  ): Promise<VectorSearchResult[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM document_chunks WHERE document_id = ?
    `);
    const rows = stmt.all(documentId) as ChunkRow[];
    if (rows.length === 0) return [];

    const scored: VectorSearchResult[] = [];

    for (const row of rows) {
      const chunk = this.mapToDomain(row);
      let score = 0;

      if (row.embedding && queryEmbedding.length > 0) {
        const chunkEmbedding = JSON.parse(row.embedding) as number[];
        if (chunkEmbedding.length !== queryEmbedding.length) {
          this.db.prepare('UPDATE document_chunks SET embedding = NULL WHERE id = ?').run(row.id);
          chunk.setEmbedding(null as any);
          score = 0;
        } else {
          score = this.cosineSimilarity(queryEmbedding, chunkEmbedding);
        }
      }

      scored.push({ chunk, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  public async invalidateIncompatibleEmbeddings(expectedDimension: number): Promise<number> {
    const rows = this.db.prepare(
      'SELECT id, embedding FROM document_chunks WHERE embedding IS NOT NULL'
    ).all() as { id: string; embedding: string }[];

    let invalidatedCount = 0;
    const updateStmt = this.db.prepare('UPDATE document_chunks SET embedding = NULL WHERE id = ?');

    const runTransaction = this.db.transaction(() => {
      for (const row of rows) {
        try {
          const parsed = JSON.parse(row.embedding);
          if (!Array.isArray(parsed) || parsed.length !== expectedDimension) {
            updateStmt.run(row.id);
            invalidatedCount++;
          }
        } catch {
          updateStmt.run(row.id);
          invalidatedCount++;
        }
      }
    });

    runTransaction();
    return invalidatedCount;
  }

  public async searchKeyword(documentId: string, query: string): Promise<DocumentChunk[]> {
    let stmt;
    let rows: ChunkRow[];

    if (!query || query.trim().length === 0) {
      stmt = this.db.prepare(`
        SELECT * FROM document_chunks WHERE document_id = ? ORDER BY chunk_index ASC
      `);
      rows = stmt.all(documentId) as ChunkRow[];
    } else {
      stmt = this.db.prepare(`
        SELECT * FROM document_chunks
        WHERE document_id = ? AND content LIKE ?
        ORDER BY chunk_index ASC
      `);
      rows = stmt.all(documentId, `%${query.trim()}%`) as ChunkRow[];
    }

    return rows.map((r) => this.mapToDomain(r));
  }

  public async deleteByDocumentId(documentId: string): Promise<void> {
    const stmt = this.db.prepare(`DELETE FROM document_chunks WHERE document_id = ?`);
    stmt.run(documentId);
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) return 0;

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private mapToDomain(row: ChunkRow): DocumentChunk {
    return new DocumentChunk({
      id: row.id,
      documentId: row.document_id,
      chunkIndex: row.chunk_index,
      pageNumber: row.page_number,
      sectionHeading: row.section_heading,
      content: row.content,
      tokenCount: row.token_count,
      embedding: row.embedding ? (JSON.parse(row.embedding) as number[]) : null,
    });
  }
}
