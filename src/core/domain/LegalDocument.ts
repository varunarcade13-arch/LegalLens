import { ValidationError } from './Errors';

export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'failed';

export interface LegalDocumentProps {
  id: string;
  userId: string;
  title: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  storagePath: string;
  pageCount: number;
  characterCount: number;
  status: DocumentStatus;
  errorMessage?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class LegalDocument {
  private props: LegalDocumentProps;

  constructor(props: LegalDocumentProps) {
    if (!props.id || props.id.trim().length === 0) {
      throw new ValidationError('Document ID is required');
    }
    if (!props.userId || props.userId.trim().length === 0) {
      throw new ValidationError('User ID is required');
    }
    if (!props.title || props.title.trim().length === 0) {
      throw new ValidationError('Document title is required');
    }
    if (props.fileSizeBytes < 0) {
      throw new ValidationError('File size must be non-negative');
    }

    this.props = {
      ...props,
      title: props.title.trim(),
      errorMessage: props.errorMessage ?? null,
    };
  }

  public get id(): string {
    return this.props.id;
  }

  public get userId(): string {
    return this.props.userId;
  }

  public get title(): string {
    return this.props.title;
  }

  public get originalFilename(): string {
    return this.props.originalFilename;
  }

  public get mimeType(): string {
    return this.props.mimeType;
  }

  public get fileSizeBytes(): number {
    return this.props.fileSizeBytes;
  }

  public get storagePath(): string {
    return this.props.storagePath;
  }

  public get pageCount(): number {
    return this.props.pageCount;
  }

  public get characterCount(): number {
    return this.props.characterCount;
  }

  public get status(): DocumentStatus {
    return this.props.status;
  }

  public get errorMessage(): string | null {
    return this.props.errorMessage ?? null;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public isOwnedBy(userId: string): boolean {
    return this.props.userId === userId;
  }

  public markProcessing(): void {
    this.props.status = 'processing';
    this.props.updatedAt = new Date();
  }

  public markReady(pageCount: number, characterCount: number): void {
    this.props.status = 'ready';
    this.props.pageCount = pageCount;
    this.props.characterCount = characterCount;
    this.props.errorMessage = null;
    this.props.updatedAt = new Date();
  }

  public markFailed(errorMessage: string): void {
    this.props.status = 'failed';
    this.props.errorMessage = errorMessage;
    this.props.updatedAt = new Date();
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.props.id,
      userId: this.props.userId,
      title: this.props.title,
      originalFilename: this.props.originalFilename,
      mimeType: this.props.mimeType,
      fileSizeBytes: this.props.fileSizeBytes,
      pageCount: this.props.pageCount,
      characterCount: this.props.characterCount,
      status: this.props.status,
      errorMessage: this.props.errorMessage,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
