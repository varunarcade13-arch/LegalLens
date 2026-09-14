import { Router } from 'express';
import { AnalysisController } from '../controllers/AnalysisController';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export function createAnalysisRoutes(
  analysisController: AnalysisController,
  authMiddleware: (req: AuthenticatedRequest, res: any, next: any) => void
): Router {
  const router = Router();

  router.use(authMiddleware);

  router.post('/:id/analyze', analysisController.analyze);
  router.get('/:id/analysis', analysisController.getAnalysis);

  return router;
}
