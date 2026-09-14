import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import {
  LoadDemoDocumentUseCase,
  GetDashboardStatsUseCase,
  DemoTemplate,
} from '../../core/use-cases';

export class DemoController {
  constructor(
    private loadDemoDocumentUseCase: LoadDemoDocumentUseCase,
    private getDashboardStatsUseCase: GetDashboardStatsUseCase,
    private demoTemplates: DemoTemplate[]
  ) {}

  public getTemplates = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    const list = this.demoTemplates.map((t) => ({
      id: t.id,
      title: t.title,
      category: t.category,
      description: t.description,
      filename: t.filename,
    }));
    res.status(200).json({ templates: list });
  };

  public loadTemplate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { templateId } = req.body;
      const document = await this.loadDemoDocumentUseCase.execute(templateId, req.userId!);
      res.status(201).json({
        message: 'Demo document loaded and analyzed successfully',
        document: document.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  };

  public getStats = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const stats = await this.getDashboardStatsUseCase.execute(req.userId!);
      res.status(200).json({
        totalDocuments: stats.totalDocuments,
        totalAnalyses: stats.totalAnalyses,
        totalPendingActionItems: stats.totalPendingActionItems,
        recentDocuments: stats.recentDocuments.map((d) => d.toJSON()),
      });
    } catch (err) {
      next(err);
    }
  };
}
