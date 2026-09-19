import jwt from 'jsonwebtoken';
import { ITokenService, TokenPayload } from '../../core/ports';
import { AuthenticationError } from '../../core/domain/Errors';

export class JwtTokenService implements ITokenService {
  private secret: string;
  private expiresIn: string;

  constructor(secret?: string, expiresIn: string = '24h') {
    const resolvedSecret = secret || process.env.JWT_SECRET;
    if (process.env.NODE_ENV === 'production') {
      if (!resolvedSecret) {
        throw new Error('JWT_SECRET environment variable is strictly required in production.');
      }
      if (resolvedSecret.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters long in production for cryptographic safety.');
      }
      this.secret = resolvedSecret;
    } else {
      this.secret = resolvedSecret || 'legallens_secure_dev_jwt_secret_key_2026';
    }
    this.expiresIn = expiresIn;
  }

  public generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn as any });
  }

  public verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.secret) as TokenPayload;
      if (!decoded || !decoded.userId || !decoded.email) {
        throw new AuthenticationError('Invalid token payload');
      }
      return {
        userId: decoded.userId,
        email: decoded.email,
      };
    } catch {
      throw new AuthenticationError('Invalid or expired authentication token');
    }
  }
}
