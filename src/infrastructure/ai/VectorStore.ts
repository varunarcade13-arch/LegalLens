import { IDatabaseClient } from '../db/Database';
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
  constructor(private db: IDatabaseClient) {}

  public async upsertChunks(chunks: DocumentChunk[]): Promise<void> {
    const statements = chunks.map((chunk) => ({
      sql: `INSERT INTO document_chunks (
        id, document_id, chunk_index, page_number, section_heading,
        content, token_count, embedding
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        content = excluded.content,
        embedding = excluded.embedding`,
      args: [
        chunk.id,
        chunk.documentId,
        chunk.chunkIndex,
        chunk.pageNumber,
        chunk.sectionHeading,
        chunk.content,
        chunk.tokenCount,
        chunk.embedding ? JSON.stringify(chunk.embedding) : null,
      ],
    }));

    await this.db.batch(statements);
  }

  public async searchSimilar(
    documentId: string,
    queryEmbedding: number[],
    topK: number = 4
  ): Promise<VectorSearchResult[]> {
    const rows = await this.db.all<ChunkRow>(
      'SELECT * FROM document_chunks WHERE document_id = ?',
      [documentId]
    );
    if (rows.length === 0) return [];

    const scored: VectorSearchResult[] = [];

    for (const row of rows) {
      const chunk = this.mapToDomain(row);
      let score = 0;

      if (row.embedding && queryEmbedding.length > 0) {
        const chunkEmbedding = JSON.parse(row.embedding) as number[];
        if (chunkEmbedding.length !== queryEmbedding.length) {
          await this.db.run('UPDATE document_chunks SET embedding = NULL WHERE id = ?', [row.id]);
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
    const rows = await this.db.all<{ id: string; embedding: string }>(
      'SELECT id, embedding FROM document_chunks WHERE embedding IS NOT NULL'
    );

    const invalidIds: string[] = [];
    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.embedding);
        if (!Array.isArray(parsed) || parsed.length !== expectedDimension) {
          invalidIds.push(row.id);
        }
      } catch {
        invalidIds.push(row.id);
      }
    }

    if (invalidIds.length > 0) {
      const statements = invalidIds.map((id) => ({
        sql: 'UPDATE document_chunks SET embedding = NULL WHERE id = ?',
        args: [id],
      }));
      await this.db.batch(statements);
    }

    return invalidIds.length;
  }

  public async searchKeyword(documentId: string, query: string): Promise<DocumentChunk[]> {
    let rows: ChunkRow[];

    if (!query || query.trim().length === 0) {
      rows = await this.db.all<ChunkRow>(
        'SELECT * FROM document_chunks WHERE document_id = ? ORDER BY chunk_index ASC',
        [documentId]
      );
    } else {
      rows = await this.db.all<ChunkRow>(
        'SELECT * FROM document_chunks WHERE document_id = ? AND content LIKE ? ORDER BY chunk_index ASC',
        [documentId, `%${query.trim()}%`]
      );
    }

    return rows.map((r) => this.mapToDomain(r));
  }

  public async deleteByDocumentId(documentId: string): Promise<void> {
    await this.db.run('DELETE FROM document_chunks WHERE document_id = ?', [documentId]);
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
