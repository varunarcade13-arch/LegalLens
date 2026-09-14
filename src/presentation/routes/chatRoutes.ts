import { Router } from 'express';
import { z } from 'zod';
import { ChatController } from '../controllers/ChatController';
import { validateBody } from '../middleware/validateRequest';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

const askSchema = z.object({
  question: z.string().min(1, 'Question cannot be empty'),
});

export function createChatRoutes(
  chatController: ChatController,
  authMiddleware: (req: AuthenticatedRequest, res: any, next: any) => void
): Router {
  const router = Router();

  router.use(authMiddleware);

  router.post('/:id/chat', validateBody(askSchema), chatController.ask);
  router.get('/:id/chat', chatController.getHistory);
  router.delete('/:id/chat', chatController.clearHistory);

  return router;
}
