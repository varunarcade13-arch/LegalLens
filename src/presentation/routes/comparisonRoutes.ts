import { Router, RequestHandler } from 'express';
import { z } from 'zod';
import { ComparisonController } from '../controllers/ComparisonController';
import { validateBody } from '../middleware/validateRequest';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

const compareSchema = z.object({
  documentAId: z.string().min(1, 'Document A ID is required'),
  documentBId: z.string().min(1, 'Document B ID is required'),
});

export function createComparisonRoutes(
  comparisonController: ComparisonController,
  authMiddleware: (req: AuthenticatedRequest, res: any, next: any) => void,
  rateLimitMiddleware?: RequestHandler
): Router {
  const router = Router();

  router.use(authMiddleware);

  if (rateLimitMiddleware) {
    router.post('/', rateLimitMiddleware, validateBody(compareSchema), comparisonController.compare);
  } else {
    router.post('/', validateBody(compareSchema), comparisonController.compare);
  }
  router.get('/', comparisonController.list);
  router.get('/:id', comparisonController.getById);

  return router;
}
