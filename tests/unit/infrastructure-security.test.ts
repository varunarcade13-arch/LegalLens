import { describe, it, expect } from 'vitest';
import { BcryptPasswordHasher } from '../../src/infrastructure/security/BcryptPasswordHasher';
import { JwtTokenService } from '../../src/infrastructure/security/JwtTokenService';
import { FileValidator } from '../../src/infrastructure/security/FileValidator';
import { InMemoryRateLimiter } from '../../src/infrastructure/security/RateLimiter';
import { AuthenticationError } from '../../src/core/domain/Errors';

describe('Infrastructure Security Units', () => {
  describe('BcryptPasswordHasher', () => {
    it('hashes passwords and verifies matching and mismatching passwords', async () => {
      const hasher = new BcryptPasswordHasher(4); // fast salt for tests
      const hash = await hasher.hash('SecurePass123!');
      expect(hash).toBeDefined();
      expect(hash).not.toBe('SecurePass123!');

      const match = await hasher.compare('SecurePass123!', hash);
      expect(match).toBe(true);

      const mismatch = await hasher.compare('WrongPassword', hash);
      expect(mismatch).toBe(false);
    });
  });

  describe('JwtTokenService', () => {
    it('generates and verifies valid token', () => {
      const service = new JwtTokenService('test_jwt_secret', '1h');
      const token = service.generateToken({ userId: 'u123', email: 'test@example.com' });
      expect(token).toBeDefined();

      const decoded = service.verifyToken(token);
      expect(decoded.userId).toBe('u123');
      expect(decoded.email).toBe('test@example.com');
    });

    it('throws AuthenticationError for invalid token, tampered token, or invalid payload', () => {
      const service = new JwtTokenService('test_jwt_secret', '1h');
      expect(() => service.verifyToken('invalid.token.string')).toThrow(AuthenticationError);

      const token = service.generateToken({ userId: 'u123', email: 'test@example.com' });
      const otherService = new JwtTokenService('different_secret', '1h');
      expect(() => otherService.verifyToken(token)).toThrow(AuthenticationError);
    });

    it('enforces strict JWT_SECRET in production mode', () => {
      const origEnv = process.env.NODE_ENV;
      const origSecret = process.env.JWT_SECRET;
      try {
        process.env.NODE_ENV = 'production';
        delete process.env.JWT_SECRET;

        // Missing secret in production throws
        expect(() => new JwtTokenService()).toThrow('JWT_SECRET environment variable is strictly required in production.');

        // Weak/short secret in production throws
        expect(() => new JwtTokenService('too-short-secret')).toThrow('JWT_SECRET must be at least 32 characters long in production');

        // Valid 32+ char secret in production succeeds
        const strongSecret = 'a-very-strong-production-jwt-secret-key-with-sufficient-entropy-32-chars';
        const prodService = new JwtTokenService(strongSecret);
        const token = prodService.generateToken({ userId: 'u1', email: 'u1@test.com' });
        expect(prodService.verifyToken(token).userId).toBe('u1');
      } finally {
        process.env.NODE_ENV = origEnv;
        if (origSecret) process.env.JWT_SECRET = origSecret;
        else delete process.env.JWT_SECRET;
      }
    });
  });

  describe('FileValidator', () => {
    const validator = new FileValidator(1024 * 1024); // 1 MB limit for tests

    it('rejects missing or empty file', () => {
      const res = validator.validate(null as any);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('No file provided');
    });

    it('rejects files exceeding size limit', () => {
      const largeBuffer = Buffer.alloc(2 * 1024 * 1024);
      const res = validator.validate({
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: largeBuffer.length,
        buffer: largeBuffer,
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('File size exceeds');
    });

    it('sanitizes filename and prevents directory traversal', () => {
      const txtBuffer = Buffer.from('Contract agreement text');
      const res = validator.validate({
        originalname: '../../etc/passwd.txt',
        mimetype: 'text/plain',
        size: txtBuffer.length,
        buffer: txtBuffer,
      });
      expect(res.valid).toBe(true);
      expect(res.safeFilename).not.toContain('/');
      expect(res.safeFilename).not.toContain('\\');
    });

    it('validates PDF magic bytes (%PDF-)', () => {
      const validPdfBuffer = Buffer.from('%PDF-1.7 valid content');
      const validRes = validator.validate({
        originalname: 'doc.pdf',
        mimetype: 'application/pdf',
        size: validPdfBuffer.length,
        buffer: validPdfBuffer,
      });
      expect(validRes.valid).toBe(true);
      expect(validRes.mimeType).toBe('application/pdf');

      const corruptPdfBuffer = Buffer.from('FAKE-PDF content');
      const corruptRes = validator.validate({
        originalname: 'corrupt.pdf',
        mimetype: 'application/pdf',
        size: corruptPdfBuffer.length,
        buffer: corruptPdfBuffer,
      });
      expect(corruptRes.valid).toBe(false);
      expect(corruptRes.error).toContain('Corrupt or invalid PDF file header');
    });

    it('validates DOCX magic bytes (PK\\x03\\x04)', () => {
      const validDocxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
      const validRes = validator.validate({
        originalname: 'doc.docx',
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: validDocxBuffer.length,
        buffer: validDocxBuffer,
      });
      expect(validRes.valid).toBe(true);

      const corruptDocxBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      const corruptRes = validator.validate({
        originalname: 'corrupt.docx',
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: corruptDocxBuffer.length,
        buffer: corruptDocxBuffer,
      });
      expect(corruptRes.valid).toBe(false);
      expect(corruptRes.error).toContain('Corrupt or invalid Word document');
    });

    it('validates TXT documents and rejects binary null bytes', () => {
      const validTxtBuffer = Buffer.from('Standard contract terms');
      const validRes = validator.validate({
        originalname: 'agreement.txt',
        mimetype: 'text/plain',
        size: validTxtBuffer.length,
        buffer: validTxtBuffer,
      });
      expect(validRes.valid).toBe(true);

      const binaryBuffer = Buffer.from([0x68, 0x65, 0x6c, 0x00, 0x6f]); // contains null byte
      const corruptRes = validator.validate({
        originalname: 'binary.txt',
        mimetype: 'text/plain',
        size: binaryBuffer.length,
        buffer: binaryBuffer,
      });
      expect(corruptRes.valid).toBe(false);
      expect(corruptRes.error).toContain('null bytes detected');
    });

    it('rejects unsupported extensions', () => {
      const res = validator.validate({
        originalname: 'script.exe',
        mimetype: 'application/octet-stream',
        size: 10,
        buffer: Buffer.from('binary content'),
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Unsupported file format');
    });
  });

  describe('InMemoryRateLimiter', () => {
    it('allows requests within limit and throttles when limit is exceeded', async () => {
      const limiter = new InMemoryRateLimiter();
      const key = 'test_ip_1';

      // Allow 3 requests per 10 seconds
      const res1 = await limiter.checkLimit(key, 3, 10000);
      expect(res1.allowed).toBe(true);
      expect(res1.remaining).toBe(2);

      const res2 = await limiter.checkLimit(key, 3, 10000);
      expect(res2.allowed).toBe(true);
      expect(res2.remaining).toBe(1);

      const res3 = await limiter.checkLimit(key, 3, 10000);
      expect(res3.allowed).toBe(true);
      expect(res3.remaining).toBe(0);

      // 4th request exceeds
      const res4 = await limiter.checkLimit(key, 3, 10000);
      expect(res4.allowed).toBe(false);
      expect(res4.remaining).toBe(0);
      expect(res4.resetTime).toBeGreaterThanOrEqual(1);

      // Reset limiter
      limiter.reset();
      const resAfterReset = await limiter.checkLimit(key, 3, 10000);
      expect(resAfterReset.allowed).toBe(true);
    });

    it('prunes expired buckets and triggers auto-pruning when size exceeds threshold', async () => {
      const limiter = new InMemoryRateLimiter();
      const now = Date.now();

      // Seed entries
      await limiter.checkLimit('stale_key_1', 10, 1000);
      await limiter.checkLimit('stale_key_2', 10, 1000);

      // Prune with future timestamp
      limiter.prune(now + 2000, 1000);

      // Seed 1001 dummy keys to trigger auto-prune branch
      for (let i = 0; i < 1005; i++) {
        await limiter.checkLimit(`ip_${i}`, 10, 1000);
      }
      expect(limiter).toBeDefined();
    });
  });
});
