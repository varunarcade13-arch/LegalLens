import { Request, Response, NextFunction } from 'express';
import { IRateLimiter } from '../../core/ports';
import { RateLimitError } from '../../core/domain/Errors';

export function createRateLimitMiddleware(
  rateLimiter: IRateLimiter,
  maxRequests: number = 100,
  windowMs: number = 60 * 1000
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = (req.ip || '127.0.0.1') + (req.headers['authorization'] ? `_${req.headers['authorization']}` : '');
    try {
      const result = await rateLimiter.checkLimit(key, maxRequests, windowMs);
      res.setHeader('X-RateLimit-Remaining', result.remaining);

      if (!result.allowed) {
        res.setHeader('Retry-After', result.resetTime);
        return next(new RateLimitError());
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
