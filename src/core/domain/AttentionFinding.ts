import { ValidationError } from './Errors';
import { ConcernLevel } from './ImportantClause';

export interface AttentionFindingProps {
  id: string;
  documentId: string;
  category: ConcernLevel;
  finding: string;
  whyItMatters: string;
  sourceReference: string;
  pageNumber: number;
  sectionHeading: string;
  questionsToConsider: string[];
  suggestedProfessionalFollowUp: string;
}

export class AttentionFinding {
  private props: AttentionFindingProps;

  constructor(props: AttentionFindingProps) {
    if (!props.id || props.id.trim().length === 0) {
      throw new ValidationError('Finding ID is required');
    }
    if (!props.documentId || props.documentId.trim().length === 0) {
      throw new ValidationError('Document ID is required');
    }
    if (!props.finding || props.finding.trim().length === 0) {
      throw new ValidationError('Finding description is required');
    }
    if (!props.whyItMatters || props.whyItMatters.trim().length === 0) {
      throw new ValidationError('Why it matters description is required');
    }

    this.props = {
      ...props,
      pageNumber: Math.max(1, props.pageNumber || 1),
      sectionHeading: props.sectionHeading || 'General',
      questionsToConsider: props.questionsToConsider || [],
    };
  }

  public get id(): string {
    return this.props.id;
  }

  public get documentId(): string {
    return this.props.documentId;
  }

  public get category(): ConcernLevel {
    return this.props.category;
  }

  public get finding(): string {
    return this.props.finding;
  }

  public get whyItMatters(): string {
    return this.props.whyItMatters;
  }

  public get sourceReference(): string {
    return this.props.sourceReference;
  }

  public get pageNumber(): number {
    return this.props.pageNumber;
  }

  public get sectionHeading(): string {
    return this.props.sectionHeading;
  }

  public get questionsToConsider(): string[] {
    return [...this.props.questionsToConsider];
  }

  public get suggestedProfessionalFollowUp(): string {
    return this.props.suggestedProfessionalFollowUp;
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.props.id,
      documentId: this.props.documentId,
      category: this.props.category,
      finding: this.props.finding,
      whyItMatters: this.props.whyItMatters,
      sourceReference: this.props.sourceReference,
      pageNumber: this.props.pageNumber,
      sectionHeading: this.props.sectionHeading,
      questionsToConsider: this.props.questionsToConsider,
      suggestedProfessionalFollowUp: this.props.suggestedProfessionalFollowUp,
    };
  }
}
