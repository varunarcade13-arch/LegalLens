import { describe, it, expect, vi } from 'vitest';
import { AuthController } from '../../src/presentation/controllers/AuthController';
import { DocumentController } from '../../src/presentation/controllers/DocumentController';
import { AnalysisController } from '../../src/presentation/controllers/AnalysisController';
import { ComparisonController } from '../../src/presentation/controllers/ComparisonController';
import { ChatController } from '../../src/presentation/controllers/ChatController';
import { BriefingController } from '../../src/presentation/controllers/BriefingController';
import { DemoController } from '../../src/presentation/controllers/DemoController';

describe('Controllers Catch Error Handling', () => {
  const mockReq = (params = {}, body = {}, query = {}, user?: any, file?: any): any => ({
    params,
    body,
    query,
    user,
    file,
  });

  const mockRes = (): any => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  });

  it('covers AuthController error branches', async () => {
    const failingUseCase = { execute: vi.fn().mockRejectedValue(new Error('Auth failed')) };
    const controller = new AuthController(
      failingUseCase as any,
      failingUseCase as any,
      failingUseCase as any,
      failingUseCase as any
    );

    const next = vi.fn();
    const req = mockReq({}, {}, {}, { userId: 'u1' });
    const res = mockRes();

    await controller.register(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));

    next.mockClear();
    await controller.login(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));

    next.mockClear();
    await controller.getProfile(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));

    next.mockClear();
    await controller.deleteAccount(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('covers DocumentController error branches', async () => {
    const failingUseCase = { execute: vi.fn().mockRejectedValue(new Error('Doc error')) };
    const controller = new DocumentController(
      failingUseCase as any,
      failingUseCase as any,
      failingUseCase as any,
      failingUseCase as any,
      failingUseCase as any
    );

    const next = vi.fn();
    const req = mockReq({ id: 'd1' }, {}, { q: 'term' }, 'u1', { originalname: 'doc.txt', buffer: Buffer.from(''), mimetype: 'text/plain', size: 10 });
    const res = mockRes();

    await controller.upload(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));

    next.mockClear();
    await controller.list(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));

    next.mockClear();
    await controller.getById(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));

    next.mockClear();
    await controller.delete(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));

    next.mockClear();
    await controller.search(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('covers AnalysisController error branches', async () => {
    const failingUseCase = { execute: vi.fn().mockRejectedValue(new Error('Analysis error')) };
    const controller = new AnalysisController(
      failingUseCase as any,
      failingUseCase as any
    );

    const next = vi.fn();
    const req = mockReq({ id: 'd1' }, {}, { force: 'true' }, 'u1');
    const res = mockRes();

    await controller.analyze(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));

    next.mockClear();
    await controller.getAnalysis(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('covers ComparisonController error branches', async () => {
    const failingUseCase = { execute: vi.fn().mockRejectedValue(new Error('Comparison error')) };
    const controller = new ComparisonController(
      failingUseCase as any,
      failingUseCase as any,
      failingUseCase as any
    );

    const next = vi.fn();
    const req = mockReq({ id: 'c1' }, { documentAId: 'dA', documentBId: 'dB' }, {}, 'u1');
    const res = mockRes();

    await controller.compare(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));

    next.mockClear();
    await controller.getById(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));

    next.mockClear();
    await controller.list(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('covers ChatController error branches', async () => {
    const failingUseCase = { execute: vi.fn().mockRejectedValue(new Error('Chat error')) };
    const controller = new ChatController(
      failingUseCase as any,
      failingUseCase as any,
      failingUseCase as any
    );

    const next = vi.fn();
    const req = mockReq({ id: 'd1' }, { question: 'What is this?' }, {}, 'u1');
    const res = mockRes();

    await controller.ask(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));

    next.mockClear();
    await controller.getHistory(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));

    next.mockClear();
    await controller.clearHistory(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('covers BriefingController error branches', async () => {
    const failingUseCase = { execute: vi.fn().mockRejectedValue(new Error('Briefing error')) };
    const controller = new BriefingController(
      failingUseCase as any,
      failingUseCase as any
    );

    const next = vi.fn();
    const req = mockReq({ id: 'd1' }, { itemId: 'chk1', completed: true }, {}, 'u1');
    const res = mockRes();

    await controller.getBriefing(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));

    next.mockClear();
    await controller.toggleChecklistItem(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));

    next.mockClear();
    await controller.exportMarkdown(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('covers DemoController error branches', async () => {
    const failingUseCase = { execute: vi.fn().mockRejectedValue(new Error('Demo error')) };
    const controller = new DemoController(
      failingUseCase as any,
      failingUseCase as any,
      []
    );

    const next = vi.fn();
    const req = mockReq({}, { templateId: 'demo-saas' }, {}, 'u1');
    const res = mockRes();

    await controller.loadTemplate(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));

    next.mockClear();
    await controller.getStats(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
