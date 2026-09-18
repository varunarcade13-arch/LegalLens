import { IDatabaseClient } from '../Database';
import { ChatMessage, StructuredAnswer } from '../../../core/domain/ChatMessage';
import { IChatRepository } from '../../../core/ports';

interface ChatMessageRow {
  id: string;
  user_id: string;
  document_id: string;
  role: 'user' | 'assistant';
  content: string;
  structured_answer: string | null;
  created_at: string;
}

export class SqliteChatRepository implements IChatRepository {
  constructor(private db: IDatabaseClient) {}

  public async saveMessage(msg: ChatMessage): Promise<void> {
    await this.db.run(
      `INSERT INTO chat_messages (id, user_id, document_id, role, content, structured_answer, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        msg.id,
        msg.userId,
        msg.documentId,
        msg.role,
        msg.content,
        msg.structuredAnswer ? JSON.stringify(msg.structuredAnswer) : null,
        msg.createdAt.toISOString(),
      ]
    );
  }

  public async getMessages(documentId: string, userId: string): Promise<ChatMessage[]> {
    const rows = await this.db.all<ChatMessageRow>(
      `SELECT * FROM chat_messages
       WHERE document_id = ? AND user_id = ?
       ORDER BY created_at ASC`,
      [documentId, userId]
    );

    return rows.map((r) => this.mapToDomain(r));
  }

  public async clearMessages(documentId: string, userId: string): Promise<void> {
    await this.db.run('DELETE FROM chat_messages WHERE document_id = ? AND user_id = ?', [
      documentId,
      userId,
    ]);
  }

  private mapToDomain(row: ChatMessageRow): ChatMessage {
    return new ChatMessage({
      id: row.id,
      userId: row.user_id,
      documentId: row.document_id,
      role: row.role,
      content: row.content,
      structuredAnswer: row.structured_answer
        ? (JSON.parse(row.structured_answer) as StructuredAnswer)
        : null,
      createdAt: new Date(row.created_at),
    });
  }
}
