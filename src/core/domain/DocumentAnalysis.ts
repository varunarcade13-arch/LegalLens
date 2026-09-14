import { ValidationError } from './Errors';
import { ImportantClause } from './ImportantClause';
import { AttentionFinding } from './AttentionFinding';

export interface PlainLanguageSummary {
  whatThisDocumentIsAbout: string;
  whatYouAreAgreeingTo: string[];
  whatTheOtherPartyIsAgreeingTo: string[];
  yourKeyResponsibilities: string[];
  yourRights: string[];
  importantDates: string[];
  financialObligations: string[];
  terminationConditions: string[];
}

export interface ExtractedFact {
  category: string;
  fact: string;
  verbatimExcerpt: string;
  pageNumber: number;
}

export interface DocumentAnalysisProps {
  id: string;
  documentId: string;
  documentType: string;
  partiesInvolved: string[];
  effectiveDate: string | null;
  expirationDate: string | null;
  jurisdiction: string | null;
  highLevelSummary: string;
  plainLanguageSummary: PlainLanguageSummary;
  extractedFacts: ExtractedFact[];
  clauses: ImportantClause[];
  findings: AttentionFinding[];
  createdAt: Date;
  updatedAt: Date;
}

export class DocumentAnalysis {
  private props: DocumentAnalysisProps;

  constructor(props: DocumentAnalysisProps) {
    if (!props.id || props.id.trim().length === 0) {
      throw new ValidationError('Analysis ID is required');
    }
    if (!props.documentId || props.documentId.trim().length === 0) {
      throw new ValidationError('Document ID is required');
    }
    if (!props.highLevelSummary || props.highLevelSummary.trim().length === 0) {
      throw new ValidationError('High-level summary is required');
    }

    this.props = {
      ...props,
      documentType: props.documentType || 'General Legal Document',
      partiesInvolved: props.partiesInvolved || [],
      extractedFacts: props.extractedFacts || [],
      clauses: props.clauses || [],
      findings: props.findings || [],
    };
  }

  public get id(): string {
    return this.props.id;
  }

  public get documentId(): string {
    return this.props.documentId;
  }

  public get documentType(): string {
    return this.props.documentType;
  }

  public get partiesInvolved(): string[] {
    return [...this.props.partiesInvolved];
  }

  public get effectiveDate(): string | null {
    return this.props.effectiveDate;
  }

  public get expirationDate(): string | null {
    return this.props.expirationDate;
  }

  public get jurisdiction(): string | null {
    return this.props.jurisdiction;
  }

  public get highLevelSummary(): string {
    return this.props.highLevelSummary;
  }

  public get plainLanguageSummary(): PlainLanguageSummary {
    return { ...this.props.plainLanguageSummary };
  }

  public get extractedFacts(): ExtractedFact[] {
    return [...this.props.extractedFacts];
  }

  public get clauses(): ImportantClause[] {
    return [...this.props.clauses];
  }

  public get findings(): AttentionFinding[] {
    return [...this.props.findings];
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.props.id,
      documentId: this.props.documentId,
      documentType: this.props.documentType,
      partiesInvolved: this.props.partiesInvolved,
      effectiveDate: this.props.effectiveDate,
      expirationDate: this.props.expirationDate,
      jurisdiction: this.props.jurisdiction,
      highLevelSummary: this.props.highLevelSummary,
      plainLanguageSummary: this.props.plainLanguageSummary,
      extractedFacts: this.props.extractedFacts,
      clauses: this.props.clauses.map((c) => c.toJSON()),
      findings: this.props.findings.map((f) => f.toJSON()),
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
