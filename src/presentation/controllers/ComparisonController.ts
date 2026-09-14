import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import {
  CompareDocumentsUseCase,
  GetComparisonUseCase,
  ListComparisonsUseCase,
} from '../../core/use-cases';

export class ComparisonController {
  constructor(
    private compareDocumentsUseCase: CompareDocumentsUseCase,
    private getComparisonUseCase: GetComparisonUseCase,
    private listComparisonsUseCase: ListComparisonsUseCase
  ) {}

  public compare = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { documentAId, documentBId } = req.body;
      const comparison = await this.compareDocumentsUseCase.execute({
        userId: req.userId!,
        documentAId,
        documentBId,
      });
      res.status(201).json({ comparison: comparison.toJSON() });
    } catch (err) {
      next(err);
    }
  };

  public getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const comparison = await this.getComparisonUseCase.execute(req.params.id, req.userId!);
      res.status(200).json({ comparison: comparison.toJSON() });
    } catch (err) {
      next(err);
    }
  };

  public list = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const comparisons = await this.listComparisonsUseCase.execute(req.userId!);
      res.status(200).json({ comparisons: comparisons.map((c) => c.toJSON()) });
    } catch (err) {
      next(err);
    }
  };
}
