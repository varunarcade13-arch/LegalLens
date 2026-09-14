import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import {
  RegisterUserUseCase,
  LoginUserUseCase,
  GetUserProfileUseCase,
  DeleteAccountUseCase,
} from '../../core/use-cases';

export class AuthController {
  constructor(
    private registerUserUseCase: RegisterUserUseCase,
    private loginUserUseCase: LoginUserUseCase,
    private getUserProfileUseCase: GetUserProfileUseCase,
    private deleteAccountUseCase: DeleteAccountUseCase
  ) {}

  public register = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.registerUserUseCase.execute(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  public login = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.loginUserUseCase.execute(req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  public getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.getUserProfileUseCase.execute(req.userId!);
      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  };

  public deleteAccount = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.deleteAccountUseCase.execute(req.userId!);
      res.status(200).json({ success: true, message: 'Account and associated data deleted permanently' });
    } catch (err) {
      next(err);
    }
  };
}
