import { Request, Response } from 'express';

export class HealthController {
  public check = (_req: Request, res: Response): void => {
    res.status(200).json({
      status: 'healthy',
      application: 'LegalLens',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      disclaimer: 'LegalLens provides AI-powered legal document assistance and information only, not formal legal advice. It is not a substitute for an attorney.',
    });
  };
}
