import { LegalDocument } from '../domain/LegalDocument';
import { NotFoundError, ValidationError } from '../domain/Errors';
import { IDocumentRepository, IAnalysisRepository, IBriefingRepository } from '../ports';
import { UploadDocumentUseCase } from './DocumentUseCases';
import { AnalyzeDocumentUseCase } from './AnalysisUseCases';

export interface DashboardStats {
  totalDocuments: number;
  totalAnalyses: number;
  totalPendingActionItems: number;
  recentDocuments: LegalDocument[];
}

export class GetDashboardStatsUseCase {
  constructor(
    private documentRepository: IDocumentRepository,
    private analysisRepository: IAnalysisRepository,
    private briefingRepository: IBriefingRepository
  ) {}

  public async execute(userId: string): Promise<DashboardStats> {
    const docs = await this.documentRepository.findByUserId(userId);
    let totalAnalyses = 0;
    let totalPendingActionItems = 0;

    for (const doc of docs) {
      const analysis = await this.analysisRepository.findByDocumentId(doc.id);
      if (analysis) {
        totalAnalyses++;
      }
      const briefing = await this.briefingRepository.findByDocumentId(doc.id);
      if (briefing) {
        const pending = briefing.actionChecklist.filter((item) => !item.completed).length;
        totalPendingActionItems += pending;
      }
    }

    return {
      totalDocuments: docs.length,
      totalAnalyses,
      totalPendingActionItems,
      recentDocuments: docs.slice(0, 5),
    };
  }
}

export interface DemoTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  filename: string;
  content: string;
}

export class LoadDemoDocumentUseCase {
  constructor(
    private uploadDocumentUseCase: UploadDocumentUseCase,
    private analyzeDocumentUseCase: AnalyzeDocumentUseCase,
    private demoTemplates: DemoTemplate[]
  ) {}

  public async execute(templateId: string, userId: string): Promise<LegalDocument> {
    const template = this.demoTemplates.find((t) => t.id === templateId);
    if (!template) {
      throw new NotFoundError(`Demo template '${templateId}' not found`);
    }
    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    const buffer = Buffer.from(template.content, 'utf-8');
    const doc = await this.uploadDocumentUseCase.execute({
      userId,
      title: template.title,
      file: {
        originalname: template.filename,
        mimetype: 'text/plain',
        size: buffer.length,
        buffer,
      },
    });

    // Auto-analyze demo document for instant exploration
    await this.analyzeDocumentUseCase.execute(doc.id, userId);

    return doc;
  }
}
