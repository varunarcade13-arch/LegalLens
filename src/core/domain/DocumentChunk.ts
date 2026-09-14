import { ValidationError } from './Errors';

export interface DocumentChunkProps {
  id: string;
  documentId: string;
  chunkIndex: number;
  pageNumber: number;
  sectionHeading: string;
  content: string;
  tokenCount: number;
  embedding?: number[] | null;
}

export class DocumentChunk {
  private props: DocumentChunkProps;

  constructor(props: DocumentChunkProps) {
    if (!props.id || props.id.trim().length === 0) {
      throw new ValidationError('Chunk ID is required');
    }
    if (!props.documentId || props.documentId.trim().length === 0) {
      throw new ValidationError('Document ID is required');
    }
    if (!props.content || props.content.trim().length === 0) {
      throw new ValidationError('Chunk content cannot be empty');
    }

    this.props = {
      ...props,
      chunkIndex: Math.max(0, props.chunkIndex),
      pageNumber: Math.max(1, props.pageNumber),
      sectionHeading: props.sectionHeading || 'General',
      embedding: props.embedding ?? null,
    };
  }

  public get id(): string {
    return this.props.id;
  }

  public get documentId(): string {
    return this.props.documentId;
  }

  public get chunkIndex(): number {
    return this.props.chunkIndex;
  }

  public get pageNumber(): number {
    return this.props.pageNumber;
  }

  public get sectionHeading(): string {
    return this.props.sectionHeading;
  }

  public get content(): string {
    return this.props.content;
  }

  public get tokenCount(): number {
    return this.props.tokenCount;
  }

  public get embedding(): number[] | null {
    return this.props.embedding ?? null;
  }

  public setEmbedding(vector: number[]): void {
    this.props.embedding = vector;
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.props.id,
      documentId: this.props.documentId,
      chunkIndex: this.props.chunkIndex,
      pageNumber: this.props.pageNumber,
      sectionHeading: this.props.sectionHeading,
      content: this.props.content,
      tokenCount: this.props.tokenCount,
    };
  }
}
