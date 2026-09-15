import { Router, RequestHandler } from 'express';
import { AnalysisController } from '../controllers/AnalysisController';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export function createAnalysisRoutes(
  analysisController: AnalysisController,
  authMiddleware: (req: AuthenticatedRequest, res: any, next: any) => void,
  rateLimitMiddleware?: RequestHandler
): Router {
  const router = Router();

  router.use(authMiddleware);

  if (rateLimitMiddleware) {
    router.post('/:id/analyze', rateLimitMiddleware, analysisController.analyze);
  } else {
    router.post('/:id/analyze', analysisController.analyze);
  }
  router.get('/:id/analysis', analysisController.getAnalysis);

  return router;
}
