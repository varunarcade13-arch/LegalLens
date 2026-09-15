import { Router, RequestHandler } from 'express';
import { z } from 'zod';
import { BriefingController } from '../controllers/BriefingController';
import { validateBody } from '../middleware/validateRequest';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

const toggleItemSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  completed: z.boolean().optional(),
});

export function createBriefingRoutes(
  briefingController: BriefingController,
  authMiddleware: (req: AuthenticatedRequest, res: any, next: any) => void,
  rateLimitMiddleware?: RequestHandler
): Router {
  const router = Router();

  router.use(authMiddleware);

  if (rateLimitMiddleware) {
    router.get('/:id/briefing', rateLimitMiddleware, briefingController.getBriefing);
  } else {
    router.get('/:id/briefing', briefingController.getBriefing);
  }
  router.patch('/:id/briefing/checklist', validateBody(toggleItemSchema), briefingController.toggleChecklistItem);
  router.get('/:id/briefing/export', briefingController.exportMarkdown);

  return router;
}
