import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import {
  UploadDocumentUseCase,
  GetDocumentUseCase,
  ListDocumentsUseCase,
  DeleteDocumentUseCase,
  SearchDocumentUseCase,
} from '../../core/use-cases';
import { ValidationError } from '../../core/domain/Errors';

export class DocumentController {
  constructor(
    private uploadDocumentUseCase: UploadDocumentUseCase,
    private getDocumentUseCase: GetDocumentUseCase,
    private listDocumentsUseCase: ListDocumentsUseCase,
    private deleteDocumentUseCase: DeleteDocumentUseCase,
    private searchDocumentUseCase: SearchDocumentUseCase
  ) {}

  public upload = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const file = req.file;
      if (!file) {
        throw new ValidationError('A legal document file is required (PDF, DOCX, or TXT)');
      }

      const title = (req.body?.title as string) || file.originalname;
      const document = await this.uploadDocumentUseCase.execute({
        userId: req.userId!,
        title,
        file: {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          buffer: file.buffer,
        },
      });

      res.status(201).json({ document: document.toJSON() });
    } catch (err) {
      next(err);
    }
  };

  public list = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const documents = await this.listDocumentsUseCase.execute(req.userId!);
      res.status(200).json({ documents: documents.map((d) => d.toJSON()) });
    } catch (err) {
      next(err);
    }
  };

  public getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const document = await this.getDocumentUseCase.execute(req.params.id, req.userId!);
      res.status(200).json({ document: document.toJSON() });
    } catch (err) {
      next(err);
    }
  };

  public delete = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.deleteDocumentUseCase.execute(req.params.id, req.userId!);
      res.status(200).json({ success: true, message: 'Document deleted successfully' });
    } catch (err) {
      next(err);
    }
  };

  public search = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = (req.query.q as string) || '';
      if (!query.trim()) {
        res.status(400).json({ error: 'Search query parameter "q" is required' });
        return;
      }
      const results = await this.searchDocumentUseCase.execute(req.params.id, req.userId!, query);
      res.status(200).json({ results });
    } catch (err) {
      next(err);
    }
  };
}
