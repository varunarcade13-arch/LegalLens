import { DocumentAnalysis } from '../domain/DocumentAnalysis';
import { ImportantClause } from '../domain/ImportantClause';
import { AttentionFinding } from '../domain/AttentionFinding';
import { NotFoundError, ForbiddenError } from '../domain/Errors';
import { IDocumentRepository, IAnalysisRepository, ILLMProvider, IVectorStore } from '../ports';

export class AnalyzeDocumentUseCase {
  constructor(
    private documentRepository: IDocumentRepository,
    private analysisRepository: IAnalysisRepository,
    private vectorStore: IVectorStore,
    private llmProvider: ILLMProvider
  ) {}

  public async execute(documentId: string, userId: string, forceReanalyze: boolean = false): Promise<DocumentAnalysis> {
    const doc = await this.documentRepository.findById(documentId);
    if (!doc) {
      throw new NotFoundError('Document not found');
    }
    if (!doc.isOwnedBy(userId)) {
      throw new ForbiddenError('Access to this document is denied');
    }

    if (!forceReanalyze) {
      const existing = await this.analysisRepository.findByDocumentId(documentId);
      if (existing) {
        return existing;
      }
    }

    // Retrieve chunks
    const chunks = await this.vectorStore.searchKeyword(documentId, '');
    const fullText = chunks.map((c) => c.content).join('\n\n');

    const generated = await this.llmProvider.generateAnalysis(doc.title, fullText, chunks);

    const now = new Date();
    const analysisId = `anl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const clauses = (generated.clauses || []).map((c, idx) => {
      return new ImportantClause({
        id: `cls_${analysisId}_${idx}`,
        documentId,
        category: c.category,
        title: c.title,
        originalText: c.originalText,
        plainExplanation: c.plainExplanation,
        whyItMatters: c.whyItMatters,
        concernLevel: c.concernLevel,
        pageNumber: c.pageNumber || 1,
        sectionHeading: c.sectionHeading || 'General',
      });
    });

    const findings = (generated.findings || []).map((f, idx) => {
      return new AttentionFinding({
        id: `fnd_${analysisId}_${idx}`,
        documentId,
        category: f.category,
        finding: f.finding,
        whyItMatters: f.whyItMatters,
        sourceReference: f.sourceReference,
        pageNumber: f.pageNumber || 1,
        sectionHeading: f.sectionHeading || 'General',
        questionsToConsider: f.questionsToConsider || [],
        suggestedProfessionalFollowUp: f.suggestedProfessionalFollowUp || 'Consider discussing with a legal professional.',
      });
    });

    const analysis = new DocumentAnalysis({
      id: analysisId,
      documentId,
      documentType: generated.documentType,
      partiesInvolved: generated.partiesInvolved,
      effectiveDate: generated.effectiveDate,
      expirationDate: generated.expirationDate,
      jurisdiction: generated.jurisdiction,
      highLevelSummary: generated.highLevelSummary,
      plainLanguageSummary: generated.plainLanguageSummary,
      extractedFacts: generated.extractedFacts,
      clauses,
      findings,
      createdAt: now,
      updatedAt: now,
    });

    await this.analysisRepository.save(analysis);
    return analysis;
  }
}

export class GetDocumentAnalysisUseCase {
  constructor(
    private documentRepository: IDocumentRepository,
    private analysisRepository: IAnalysisRepository,
    private analyzeDocumentUseCase: AnalyzeDocumentUseCase
  ) {}

  public async execute(documentId: string, userId: string): Promise<DocumentAnalysis> {
    const doc = await this.documentRepository.findById(documentId);
    if (!doc) {
      throw new NotFoundError('Document not found');
    }
    if (!doc.isOwnedBy(userId)) {
      throw new ForbiddenError('Access to this document is denied');
    }

    const existing = await this.analysisRepository.findByDocumentId(documentId);
    if (existing) {
      return existing;
    }

    return this.analyzeDocumentUseCase.execute(documentId, userId);
  }
}
