import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import {
  GetLegalBriefingUseCase,
  UpdateActionChecklistUseCase,
} from '../../core/use-cases';

export class BriefingController {
  constructor(
    private getLegalBriefingUseCase: GetLegalBriefingUseCase,
    private updateActionChecklistUseCase: UpdateActionChecklistUseCase
  ) {}

  public getBriefing = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const briefing = await this.getLegalBriefingUseCase.execute(req.params.id, req.userId!);
      res.status(200).json({ briefing: briefing.toJSON() });
    } catch (err) {
      next(err);
    }
  };

  public toggleChecklistItem = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { itemId, completed } = req.body;
      const briefing = await this.updateActionChecklistUseCase.execute(
        req.params.id,
        req.userId!,
        itemId,
        completed
      );
      res.status(200).json({ briefing: briefing.toJSON() });
    } catch (err) {
      next(err);
    }
  };

  public exportMarkdown = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const briefing = await this.getLegalBriefingUseCase.execute(req.params.id, req.userId!);
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="LegalBriefing_${briefing.documentId}.md"`
      );
      res.status(200).send(briefing.toMarkdown());
    } catch (err) {
      next(err);
    }
  };
}
