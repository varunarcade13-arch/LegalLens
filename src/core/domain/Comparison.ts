import { ValidationError } from './Errors';

export interface ClauseDifference {
  category: string;
  documentA: string;
  documentB: string;
  difference: string;
  whyItMatters: string;
  impactLevel: 'low' | 'moderate' | 'significant';
}

export interface ComparisonProps {
  id: string;
  userId: string;
  documentAId: string;
  documentBId: string;
  documentATitle: string;
  documentBTitle: string;
  executiveSummary: string;
  addedClauses: ClauseDifference[];
  removedClauses: ClauseDifference[];
  modifiedClauses: ClauseDifference[];
  changedObligations: ClauseDifference[];
  changedFinancialTerms: ClauseDifference[];
  changedDates: ClauseDifference[];
  changedTermination: ClauseDifference[];
  changedLiability: ClauseDifference[];
  changedDisputeResolution: ClauseDifference[];
  createdAt: Date;
}

export class Comparison {
  private props: ComparisonProps;

  constructor(props: ComparisonProps) {
    if (!props.id || props.id.trim().length === 0) {
      throw new ValidationError('Comparison ID is required');
    }
    if (!props.userId || props.userId.trim().length === 0) {
      throw new ValidationError('User ID is required');
    }
    if (!props.documentAId || !props.documentBId) {
      throw new ValidationError('Both document IDs are required for comparison');
    }
    if (props.documentAId === props.documentBId) {
      throw new ValidationError('Cannot compare a document with itself');
    }
    if (!props.executiveSummary || props.executiveSummary.trim().length === 0) {
      throw new ValidationError('Executive summary is required');
    }

    this.props = {
      ...props,
      addedClauses: props.addedClauses || [],
      removedClauses: props.removedClauses || [],
      modifiedClauses: props.modifiedClauses || [],
      changedObligations: props.changedObligations || [],
      changedFinancialTerms: props.changedFinancialTerms || [],
      changedDates: props.changedDates || [],
      changedTermination: props.changedTermination || [],
      changedLiability: props.changedLiability || [],
      changedDisputeResolution: props.changedDisputeResolution || [],
    };
  }

  public get id(): string {
    return this.props.id;
  }

  public get userId(): string {
    return this.props.userId;
  }

  public get documentAId(): string {
    return this.props.documentAId;
  }

  public get documentBId(): string {
    return this.props.documentBId;
  }

  public get documentATitle(): string {
    return this.props.documentATitle;
  }

  public get documentBTitle(): string {
    return this.props.documentBTitle;
  }

  public get executiveSummary(): string {
    return this.props.executiveSummary;
  }

  public get addedClauses(): ClauseDifference[] {
    return [...this.props.addedClauses];
  }

  public get removedClauses(): ClauseDifference[] {
    return [...this.props.removedClauses];
  }

  public get modifiedClauses(): ClauseDifference[] {
    return [...this.props.modifiedClauses];
  }

  public get changedObligations(): ClauseDifference[] {
    return [...this.props.changedObligations];
  }

  public get changedFinancialTerms(): ClauseDifference[] {
    return [...this.props.changedFinancialTerms];
  }

  public get changedDates(): ClauseDifference[] {
    return [...this.props.changedDates];
  }

  public get changedTermination(): ClauseDifference[] {
    return [...this.props.changedTermination];
  }

  public get changedLiability(): ClauseDifference[] {
    return [...this.props.changedLiability];
  }

  public get changedDisputeResolution(): ClauseDifference[] {
    return [...this.props.changedDisputeResolution];
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
      documentAId: this.props.documentAId,
      documentBId: this.props.documentBId,
      documentATitle: this.props.documentATitle,
      documentBTitle: this.props.documentBTitle,
      executiveSummary: this.props.executiveSummary,
      addedClauses: this.props.addedClauses,
      removedClauses: this.props.removedClauses,
      modifiedClauses: this.props.modifiedClauses,
      changedObligations: this.props.changedObligations,
      changedFinancialTerms: this.props.changedFinancialTerms,
      changedDates: this.props.changedDates,
      changedTermination: this.props.changedTermination,
      changedLiability: this.props.changedLiability,
      changedDisputeResolution: this.props.changedDisputeResolution,
      createdAt: this.props.createdAt.toISOString(),
    };
  }
}
