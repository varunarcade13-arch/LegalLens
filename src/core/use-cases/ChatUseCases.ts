import { ChatMessage } from '../domain/ChatMessage';
import { NotFoundError, ForbiddenError, ValidationError } from '../domain/Errors';
import {
  IDocumentRepository,
  IChatRepository,
  IVectorStore,
  IEmbeddingService,
  ILLMProvider,
  IPromptSecurityService,
} from '../ports';

export interface AskChatDTO {
  userId: string;
  documentId: string;
  question: string;
}

export class AskDocumentChatUseCase {
  constructor(
    private documentRepository: IDocumentRepository,
    private chatRepository: IChatRepository,
    private vectorStore: IVectorStore,
    private embeddingService: IEmbeddingService,
    private llmProvider: ILLMProvider,
    private promptSecurityService?: IPromptSecurityService
  ) {}

  public async execute(dto: AskChatDTO): Promise<ChatMessage> {
    if (!dto.question || dto.question.trim().length === 0) {
      throw new ValidationError('Question cannot be empty');
    }

    if (this.promptSecurityService) {
      this.promptSecurityService.validateUserPrompt(dto.question);
    }

    const doc = await this.documentRepository.findById(dto.documentId);
    if (!doc) {
      throw new NotFoundError('Document not found');
    }
    if (!doc.isOwnedBy(dto.userId)) {
      throw new ForbiddenError('Access to this document is denied');
    }

    // Save user message
    const userMsgId = `msg_${Date.now()}_u_${Math.random().toString(36).substring(2, 7)}`;
    const userMsg = new ChatMessage({
      id: userMsgId,
      userId: dto.userId,
      documentId: dto.documentId,
      role: 'user',
      content: dto.question.trim(),
      createdAt: new Date(),
    });
    await this.chatRepository.saveMessage(userMsg);

    // RAG Pipeline
    const queryEmbedding = await this.embeddingService.generateEmbedding(dto.question, 'RETRIEVAL_QUERY');
    const searchResults = await this.vectorStore.searchSimilar(dto.documentId, queryEmbedding, 5);
    const seenChunkIds = new Set<string>();
    const contextChunks = searchResults
      .map((r) => r.chunk)
      .filter((chunk) => {
        if (seenChunkIds.has(chunk.id)) return false;
        seenChunkIds.add(chunk.id);
        return true;
      })
      .slice(0, 4);

    if (process.env.NODE_ENV !== 'test') {
      const topResult = searchResults[0];
      const topSnippet = topResult?.chunk?.content ? topResult.chunk.content.substring(0, 80).replace(/\n+/g, ' ') : 'N/A';
      console.log(`Query: ${dto.question.trim()}`);
      console.log(`Retrieved chunks: ${contextChunks.length}`);
      console.log(`Top similarity: ${topResult?.score !== undefined ? topResult.score.toFixed(4) : 'N/A'}`);
      console.log(`Top chunk page: ${topResult?.chunk?.pageNumber || 1}`);
      console.log(`Top chunk text snippet: ${topSnippet}`);
    }

    // Answer grounded question
    const structuredAnswer = await this.llmProvider.answerGroundedQuestion(dto.question.trim(), contextChunks);

    const assistantMsgId = `msg_${Date.now()}_a_${Math.random().toString(36).substring(2, 7)}`;
    const assistantMsg = new ChatMessage({
      id: assistantMsgId,
      userId: dto.userId,
      documentId: dto.documentId,
      role: 'assistant',
      content: structuredAnswer.shortAnswer,
      structuredAnswer,
      createdAt: new Date(),
    });
    await this.chatRepository.saveMessage(assistantMsg);

    return assistantMsg;
  }
}

export class GetChatHistoryUseCase {
  constructor(
    private documentRepository: IDocumentRepository,
    private chatRepository: IChatRepository
  ) {}

  public async execute(documentId: string, userId: string): Promise<ChatMessage[]> {
    const doc = await this.documentRepository.findById(documentId);
    if (!doc) {
      throw new NotFoundError('Document not found');
    }
    if (!doc.isOwnedBy(userId)) {
      throw new ForbiddenError('Access to this document is denied');
    }
    return this.chatRepository.getMessages(documentId, userId);
  }
}

export class ClearChatHistoryUseCase {
  constructor(
    private documentRepository: IDocumentRepository,
    private chatRepository: IChatRepository
  ) {}

  public async execute(documentId: string, userId: string): Promise<void> {
    const doc = await this.documentRepository.findById(documentId);
    if (!doc) {
      throw new NotFoundError('Document not found');
    }
    if (!doc.isOwnedBy(userId)) {
      throw new ForbiddenError('Access to this document is denied');
    }
    await this.chatRepository.clearMessages(documentId, userId);
  }
}
