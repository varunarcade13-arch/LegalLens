import { Request, Response, NextFunction } from 'express';
import { ITokenService, IUserRepository } from '../../core/ports';
import { AuthenticationError } from '../../core/domain/Errors';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export function createAuthMiddleware(
  tokenService: ITokenService,
  userRepository?: IUserRepository
) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AuthenticationError('Missing or malformed Authorization header'));
    }

    const token = authHeader.substring(7).trim();
    try {
      const payload = tokenService.verifyToken(token);
      
      if (userRepository) {
        const user = await userRepository.findById(payload.userId);
        if (!user) {
          return next(new AuthenticationError('User not found or session expired. Please log in again.'));
        }
      }

      req.userId = payload.userId;
      req.userEmail = payload.email;
      next();
    } catch (err) {
      next(err);
    }
  };
}

