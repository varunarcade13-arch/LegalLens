import { ValidationError } from './Errors';

export interface Citation {
  chunkId: string;
  pageNumber: number;
  sectionHeading: string;
  textSnippet: string;
}

export interface StructuredAnswer {
  shortAnswer: string;
  whatTheDocumentSays: string;
  whyItMatters: string;
  sourceCitations: Citation[];
  questionsForLawyer: string[];
  grounded: boolean;
}

export interface ChatMessageProps {
  id: string;
  userId: string;
  documentId: string;
  role: 'user' | 'assistant';
  content: string;
  structuredAnswer?: StructuredAnswer | null;
  createdAt: Date;
}

export class ChatMessage {
  private props: ChatMessageProps;

  constructor(props: ChatMessageProps) {
    if (!props.id || props.id.trim().length === 0) {
      throw new ValidationError('Message ID is required');
    }
    if (!props.userId || props.userId.trim().length === 0) {
      throw new ValidationError('User ID is required');
    }
    if (!props.documentId || props.documentId.trim().length === 0) {
      throw new ValidationError('Document ID is required');
    }
    if (!props.content || props.content.trim().length === 0) {
      throw new ValidationError('Message content cannot be empty');
    }

    this.props = {
      ...props,
      structuredAnswer: props.structuredAnswer ?? null,
    };
  }

  public get id(): string {
    return this.props.id;
  }

  public get userId(): string {
    return this.props.userId;
  }

  public get documentId(): string {
    return this.props.documentId;
  }

  public get role(): 'user' | 'assistant' {
    return this.props.role;
  }

  public get content(): string {
    return this.props.content;
  }

  public get structuredAnswer(): StructuredAnswer | null {
    return this.props.structuredAnswer ? { ...this.props.structuredAnswer } : null;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public isOwnedBy(userId: string): boolean {
    return this.props.userId === userId;
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.props.id,
      userId: this.props.userId,
      documentId: this.props.documentId,
      role: this.props.role,
      content: this.props.content,
      structuredAnswer: this.props.structuredAnswer,
      createdAt: this.props.createdAt.toISOString(),
    };
  }
}
