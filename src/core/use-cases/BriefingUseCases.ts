import { LegalBriefing } from '../domain/LegalBriefing';
import { NotFoundError, ForbiddenError } from '../domain/Errors';
import {
  IDocumentRepository,
  IBriefingRepository,
  IAnalysisRepository,
  ILLMProvider,
} from '../ports';
import { AnalyzeDocumentUseCase } from './AnalysisUseCases';

export class GenerateLegalBriefingUseCase {
  constructor(
    private documentRepository: IDocumentRepository,
    private briefingRepository: IBriefingRepository,
    private analysisRepository: IAnalysisRepository,
    private analyzeDocumentUseCase: AnalyzeDocumentUseCase,
    private llmProvider: ILLMProvider
  ) {}

  public async execute(documentId: string, userId: string): Promise<LegalBriefing> {
    const doc = await this.documentRepository.findById(documentId);
    if (!doc) {
      throw new NotFoundError('Document not found');
    }
    if (!doc.isOwnedBy(userId)) {
      throw new ForbiddenError('Access to this document is denied');
    }

    let analysis = await this.analysisRepository.findByDocumentId(documentId);
    if (!analysis) {
      analysis = await this.analyzeDocumentUseCase.execute(documentId, userId);
    }

    const generated = await this.llmProvider.generateBriefing(doc.title, analysis);

    const briefingId = `brf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();

    const briefing = new LegalBriefing({
      id: briefingId,
      userId,
      documentId,
      documentTitle: doc.title,
      conciseSummary: generated.conciseSummary,
      lawyerChecklist: generated.lawyerChecklist,
      actionChecklist: generated.actionChecklist,
      createdAt: now,
      updatedAt: now,
    });

    await this.briefingRepository.save(briefing);
    return briefing;
  }
}

export class GetLegalBriefingUseCase {
  constructor(
    private documentRepository: IDocumentRepository,
    private briefingRepository: IBriefingRepository,
    private generateBriefingUseCase: GenerateLegalBriefingUseCase
  ) {}

  public async execute(documentId: string, userId: string): Promise<LegalBriefing> {
    const doc = await this.documentRepository.findById(documentId);
    if (!doc) {
      throw new NotFoundError('Document not found');
    }
    if (!doc.isOwnedBy(userId)) {
      throw new ForbiddenError('Access to this document is denied');
    }

    const existing = await this.briefingRepository.findByDocumentId(documentId);
    if (existing) {
      return existing;
    }

    return this.generateBriefingUseCase.execute(documentId, userId);
  }
}

export class UpdateActionChecklistUseCase {
  constructor(
    private documentRepository: IDocumentRepository,
    private briefingRepository: IBriefingRepository
  ) {}

  public async execute(
    documentId: string,
    userId: string,
    itemId: string,
    completed?: boolean
  ): Promise<LegalBriefing> {
    const doc = await this.documentRepository.findById(documentId);
    if (!doc) {
      throw new NotFoundError('Document not found');
    }
    if (!doc.isOwnedBy(userId)) {
      throw new ForbiddenError('Access to this document is denied');
    }

    const briefing = await this.briefingRepository.findByDocumentId(documentId);
    if (!briefing) {
      throw new NotFoundError('Briefing not found for this document');
    }

    briefing.toggleChecklistItem(itemId, completed);
    await this.briefingRepository.update(briefing);

    return briefing;
  }
}
