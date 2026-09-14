import { ValidationError } from './Errors';

export type ConcernLevel = 'informational' | 'review_carefully' | 'high_attention';

export type ClauseCategory =
  | 'payment_obligations'
  | 'termination'
  | 'renewal'
  | 'cancellation'
  | 'liability'
  | 'indemnification'
  | 'confidentiality'
  | 'intellectual_property'
  | 'non_compete'
  | 'non_solicitation'
  | 'dispute_resolution'
  | 'arbitration'
  | 'governing_law'
  | 'data_privacy'
  | 'penalties'
  | 'auto_renewal'
  | 'notice_requirements'
  | 'force_majeure'
  | 'other';

export interface ImportantClauseProps {
  id: string;
  documentId: string;
  category: ClauseCategory;
  title: string;
  originalText: string;
  plainExplanation: string;
  whyItMatters: string;
  concernLevel: ConcernLevel;
  pageNumber: number;
  sectionHeading: string;
}

export class ImportantClause {
  private props: ImportantClauseProps;

  constructor(props: ImportantClauseProps) {
    if (!props.id || props.id.trim().length === 0) {
      throw new ValidationError('Clause ID is required');
    }
    if (!props.documentId || props.documentId.trim().length === 0) {
      throw new ValidationError('Document ID is required');
    }
    if (!props.title || props.title.trim().length === 0) {
      throw new ValidationError('Clause title is required');
    }
    if (!props.plainExplanation || props.plainExplanation.trim().length === 0) {
      throw new ValidationError('Plain explanation is required');
    }

    this.props = {
      ...props,
      pageNumber: Math.max(1, props.pageNumber || 1),
      sectionHeading: props.sectionHeading || 'General',
    };
  }

  public get id(): string {
    return this.props.id;
  }

  public get documentId(): string {
    return this.props.documentId;
  }

  public get category(): ClauseCategory {
    return this.props.category;
  }

  public get title(): string {
    return this.props.title;
  }

  public get originalText(): string {
    return this.props.originalText;
  }

  public get plainExplanation(): string {
    return this.props.plainExplanation;
  }

  public get whyItMatters(): string {
    return this.props.whyItMatters;
  }

  public get concernLevel(): ConcernLevel {
    return this.props.concernLevel;
  }

  public get pageNumber(): number {
    return this.props.pageNumber;
  }

  public get sectionHeading(): string {
    return this.props.sectionHeading;
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.props.id,
      documentId: this.props.documentId,
      category: this.props.category,
      title: this.props.title,
      originalText: this.props.originalText,
      plainExplanation: this.props.plainExplanation,
      whyItMatters: this.props.whyItMatters,
      concernLevel: this.props.concernLevel,
      pageNumber: this.props.pageNumber,
      sectionHeading: this.props.sectionHeading,
    };
  }
}
