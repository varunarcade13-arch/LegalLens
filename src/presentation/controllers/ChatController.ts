import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import {
  AskDocumentChatUseCase,
  GetChatHistoryUseCase,
  ClearChatHistoryUseCase,
} from '../../core/use-cases';

export class ChatController {
  constructor(
    private askDocumentChatUseCase: AskDocumentChatUseCase,
    private getChatHistoryUseCase: GetChatHistoryUseCase,
    private clearChatHistoryUseCase: ClearChatHistoryUseCase
  ) {}

  public ask = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { question } = req.body;
      const message = await this.askDocumentChatUseCase.execute({
        userId: req.userId!,
        documentId: req.params.id,
        question,
      });
      res.status(200).json({ message: message.toJSON() });
    } catch (err) {
      next(err);
    }
  };

  public getHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const messages = await this.getChatHistoryUseCase.execute(req.params.id, req.userId!);
      res.status(200).json({ messages: messages.map((m) => m.toJSON()) });
    } catch (err) {
      next(err);
    }
  };

  public clearHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.clearChatHistoryUseCase.execute(req.params.id, req.userId!);
      res.status(200).json({ success: true, message: 'Chat history cleared' });
    } catch (err) {
      next(err);
    }
  };
}
