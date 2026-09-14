import { Comparison } from '../domain/Comparison';
import { NotFoundError, ForbiddenError, ValidationError } from '../domain/Errors';
import { IDocumentRepository, IComparisonRepository, ILLMProvider, IVectorStore } from '../ports';

export interface CompareDocumentsDTO {
  userId: string;
  documentAId: string;
  documentBId: string;
}

export class CompareDocumentsUseCase {
  constructor(
    private documentRepository: IDocumentRepository,
    private comparisonRepository: IComparisonRepository,
    private vectorStore: IVectorStore,
    private llmProvider: ILLMProvider
  ) {}

  public async execute(dto: CompareDocumentsDTO): Promise<Comparison> {
    if (!dto.documentAId || !dto.documentBId) {
      throw new ValidationError('Two document IDs are required for comparison');
    }
    if (dto.documentAId === dto.documentBId) {
      throw new ValidationError('Cannot compare a document with itself');
    }

    const docA = await this.documentRepository.findById(dto.documentAId);
    if (!docA) {
      throw new NotFoundError(`Document A (${dto.documentAId}) not found`);
    }
    if (!docA.isOwnedBy(dto.userId)) {
      throw new ForbiddenError(`Access to Document A is denied`);
    }

    const docB = await this.documentRepository.findById(dto.documentBId);
    if (!docB) {
      throw new NotFoundError(`Document B (${dto.documentBId}) not found`);
    }
    if (!docB.isOwnedBy(dto.userId)) {
      throw new ForbiddenError(`Access to Document B is denied`);
    }

    const chunksA = await this.vectorStore.searchKeyword(dto.documentAId, '');
    const chunksB = await this.vectorStore.searchKeyword(dto.documentBId, '');

    const textA = chunksA.map((c) => c.content).join('\n\n');
    const textB = chunksB.map((c) => c.content).join('\n\n');

    const generated = await this.llmProvider.generateComparison(
      { title: docA.title, text: textA },
      { title: docB.title, text: textB }
    );

    const comparisonId = `cmp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const comparison = new Comparison({
      id: comparisonId,
      userId: dto.userId,
      documentAId: docA.id,
      documentBId: docB.id,
      documentATitle: docA.title,
      documentBTitle: docB.title,
      executiveSummary: generated.executiveSummary,
      addedClauses: generated.addedClauses,
      removedClauses: generated.removedClauses,
      modifiedClauses: generated.modifiedClauses,
      changedObligations: generated.changedObligations,
      changedFinancialTerms: generated.changedFinancialTerms,
      changedDates: generated.changedDates,
      changedTermination: generated.changedTermination,
      changedLiability: generated.changedLiability,
      changedDisputeResolution: generated.changedDisputeResolution,
      createdAt: new Date(),
    });

    await this.comparisonRepository.save(comparison);
    return comparison;
  }
}

export class GetComparisonUseCase {
  constructor(private comparisonRepository: IComparisonRepository) {}

  public async execute(comparisonId: string, userId: string): Promise<Comparison> {
    const comp = await this.comparisonRepository.findById(comparisonId);
    if (!comp) {
      throw new NotFoundError('Comparison not found');
    }
    if (!comp.isOwnedBy(userId)) {
      throw new ForbiddenError('Access to this comparison is denied');
    }
    return comp;
  }
}

export class ListComparisonsUseCase {
  constructor(private comparisonRepository: IComparisonRepository) {}

  public async execute(userId: string): Promise<Comparison[]> {
    return this.comparisonRepository.findByUserId(userId);
  }
}
