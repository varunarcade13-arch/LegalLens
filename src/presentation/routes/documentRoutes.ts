import { Router } from 'express';
import multer from 'multer';
import { DocumentController } from '../controllers/DocumentController';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

export function createDocumentRoutes(
  documentController: DocumentController,
  authMiddleware: (req: AuthenticatedRequest, res: any, next: any) => void
): Router {
  const router = Router();

  router.use(authMiddleware);

  router.post('/', upload.single('file'), documentController.upload);
  router.get('/', documentController.list);
  router.get('/:id', documentController.getById);
  router.delete('/:id', documentController.delete);
  router.get('/:id/search', documentController.search);

  return router;
}
