import { Request, Response, NextFunction } from 'express';
import { ITokenService } from '../../core/ports';
import { AuthenticationError } from '../../core/domain/Errors';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export function createAuthMiddleware(tokenService: ITokenService) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AuthenticationError('Missing or malformed Authorization header'));
    }

    const token = authHeader.substring(7).trim();
    try {
      const payload = tokenService.verifyToken(token);
      req.userId = payload.userId;
      req.userEmail = payload.email;
      next();
    } catch (err) {
      next(err);
    }
  };
}
