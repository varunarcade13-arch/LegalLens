import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AnalyzeDocumentUseCase, GetDocumentAnalysisUseCase } from '../../core/use-cases';

export class AnalysisController {
  constructor(
    private analyzeDocumentUseCase: AnalyzeDocumentUseCase,
    private getDocumentAnalysisUseCase: GetDocumentAnalysisUseCase
  ) {}

  public analyze = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const forceReanalyze = req.query.force === 'true';
      const analysis = await this.analyzeDocumentUseCase.execute(
        req.params.id,
        req.userId!,
        forceReanalyze
      );
      res.status(200).json({ analysis: analysis.toJSON() });
    } catch (err) {
      next(err);
    }
  };

  public getAnalysis = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const analysis = await this.getDocumentAnalysisUseCase.execute(req.params.id, req.userId!);
      res.status(200).json({ analysis: analysis.toJSON() });
    } catch (err) {
      next(err);
    }
  };
}
