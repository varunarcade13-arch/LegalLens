import { Router } from 'express';
import { z } from 'zod';
import { DemoController } from '../controllers/DemoController';
import { validateBody } from '../middleware/validateRequest';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

const loadDemoSchema = z.object({
  templateId: z.string().min(1, 'Template ID is required'),
});

export function createDemoRoutes(
  demoController: DemoController,
  authMiddleware: (req: AuthenticatedRequest, res: any, next: any) => void
): Router {
  const router = Router();

  router.get('/templates', demoController.getTemplates);
  router.post('/load', authMiddleware, validateBody(loadDemoSchema), demoController.loadTemplate);
  router.get('/stats', authMiddleware, demoController.getStats);

  return router;
}
