import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiEmbeddingProvider } from '../../src/infrastructure/ai/GeminiEmbeddingProvider';
import { EmbeddingService } from '../../src/infrastructure/ai/EmbeddingService';
import { GeminiLLMProvider } from '../../src/infrastructure/ai/GeminiLLMProvider';
import { OpenAILLMProvider } from '../../src/infrastructure/ai/OpenAILLMProvider';
import { LLMProviderFactory } from '../../src/infrastructure/ai/LLMProviderFactory';
import { PromptSecurityService } from '../../src/infrastructure/ai/PromptSecurityService';
import { DocumentChunk } from '../../src/core/domain/DocumentChunk';
import { LegalDocument } from '../../src/core/domain/LegalDocument';
import { ReindexDocumentUseCase } from '../../src/core/use-cases/DocumentUseCases';
import { AskDocumentChatUseCase } from '../../src/core/use-cases/ChatUseCases';
import {
  AIServiceError,
  RateLimitError,
  NotFoundError,
  ForbiddenError,
} from '../../src/core/domain/Errors';
import { createAnalysisRoutes } from '../../src/presentation/routes/analysisRoutes';
import { createBriefingRoutes } from '../../src/presentation/routes/briefingRoutes';
import { createChatRoutes } from '../../src/presentation/routes/chatRoutes';
import { createComparisonRoutes } from '../../src/presentation/routes/comparisonRoutes';
import { VectorStore } from '../../src/infrastructure/ai/VectorStore';
import { AppDatabase } from '../../src/infrastructure/db/Database';
import { GenerateLegalBriefingUseCase, GetLegalBriefingUseCase } from '../../src/core/use-cases/BriefingUseCases';
import { DocumentAnalysis } from '../../src/core/domain/DocumentAnalysis';

describe('Gemini Real AI & GenAI Coverage Suite', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  describe('GeminiEmbeddingProvider', () => {
    it('constructs with defaults and checks name', () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_EMBEDDING_MODEL;
      const provider = new GeminiEmbeddingProvider();
      expect(provider.name).toBe('GeminiEmbeddingProvider');
      expect((provider as any).model).toBe('gemini-embedding-001');
    });

    it('throws AIServiceUnavailableError when API key is missing', async () => {
      const provider = new GeminiEmbeddingProvider('');
      await expect(provider.generateEmbedding('hello')).rejects.toThrow(
        'Gemini API key is not configured for embeddings.'
      );
      await expect(provider.generateEmbeddings(['hello'])).rejects.toThrow(
        'Gemini API key is not configured for embeddings.'
      );
    });

    it('returns 3072 zero values for empty or whitespace text', async () => {
      const provider = new GeminiEmbeddingProvider('test-key');
      const res = await provider.generateEmbedding('   ');
      expect(res).toHaveLength(3072);
      expect(res.every((v) => v === 0)).toBe(true);
    });

    it('returns empty array when generateEmbeddings is called with empty list', async () => {
      const provider = new GeminiEmbeddingProvider('test-key');
      const res = await provider.generateEmbeddings([]);
      expect(res).toEqual([]);
    });

    it('successfully generates embeddings via Gemini API with x-goog-api-key header and taskType', async () => {
      const provider = new GeminiEmbeddingProvider('test-key');
      const fakeEmbedding = new Array(3072).fill(0.01);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: { values: fakeEmbedding },
        }),
      });

      const res = await provider.generateEmbedding('clause content', 'RETRIEVAL_DOCUMENT');
      expect(res).toEqual(fakeEmbedding);

      const [url, options] = (global.fetch as any).mock.calls[0];
      expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent');
      expect(options.headers['x-goog-api-key']).toBe('test-key');
      const body = JSON.parse(options.body);
      expect(body.taskType).toBe('RETRIEVAL_DOCUMENT');
      expect(body.model).toBe('models/gemini-embedding-001');
    });

    it('successfully sends RETRIEVAL_QUERY taskType for query embeddings', async () => {
      const provider = new GeminiEmbeddingProvider('test-key');
      const fakeEmbedding = new Array(3072).fill(0.02);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: { values: fakeEmbedding },
        }),
      });

      const res = await provider.generateEmbedding('what is the termination clause?', 'RETRIEVAL_QUERY');
      expect(res).toEqual(fakeEmbedding);

      const [, options] = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.taskType).toBe('RETRIEVAL_QUERY');
    });

    it('handles batching in generateEmbeddings (> 16 items)', async () => {
      const provider = new GeminiEmbeddingProvider('test-key');
      const fakeEmbedding = [0.1, 0.2];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: { values: fakeEmbedding },
        }),
      });

      const texts = Array.from({ length: 20 }, (_, i) => `chunk ${i}`);
      const res = await provider.generateEmbeddings(texts, 'RETRIEVAL_DOCUMENT');
      expect(res).toHaveLength(20);
      expect(global.fetch).toHaveBeenCalledTimes(20);
    });

    it('handles 429 rate limit error with rich diagnostics in generateEmbedding', async () => {
      const provider = new GeminiEmbeddingProvider('test-key');
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'Quota exceeded' } }),
      });

      await expect(provider.generateEmbedding('test')).rejects.toThrow(
        'Gemini embedding API rate limit exceeded (model: gemini-embedding-001, status: 429): Quota exceeded'
      );
    });

    it('handles non-ok HTTP status with rich diagnostics in generateEmbedding', async () => {
      const provider = new GeminiEmbeddingProvider('test-key');
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: { message: 'Model not found' } }),
      });

      await expect(provider.generateEmbedding('test')).rejects.toThrow(
        'Gemini embedding API error (model: gemini-embedding-001, status: 404): Model not found'
      );

      // Fallback when json parsing fails
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => { throw new Error('Not JSON'); },
      });

      await expect(provider.generateEmbedding('test')).rejects.toThrow(
        'Gemini embedding API error (model: gemini-embedding-001, status: 500): Internal Server Error'
      );

      // Fallback when json has no error.message
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ customError: 'Invalid field' }),
      });

      await expect(provider.generateEmbedding('test')).rejects.toThrow(
        'Gemini embedding API error (model: gemini-embedding-001, status: 400): {"customError":"Invalid field"}'
      );

      // Fallback when json parsing fails and statusText is empty
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: '',
        json: async () => { throw new Error('Not JSON'); },
      });

      await expect(provider.generateEmbedding('test')).rejects.toThrow(
        'Gemini embedding API error (model: gemini-embedding-001, status: 500): Unknown error'
      );
    });

    it('handles malformed embedding response without values array', async () => {
      const provider = new GeminiEmbeddingProvider('test-key');
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: {} }),
      });

      await expect(provider.generateEmbedding('test')).rejects.toThrow(
        'Malformed embedding response from Gemini API.'
      );
    });

    it('handles network error in generateEmbedding and maps to AIServiceUnavailableError', async () => {
      const provider = new GeminiEmbeddingProvider('test-key');
      global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

      await expect(provider.generateEmbedding('test')).rejects.toThrow(
        'AI service is temporarily unavailable. Please try again.'
      );
    });

    it('uses GEMINI_EMBEDDING_MODEL from environment if model argument is empty', () => {
      process.env.GEMINI_EMBEDDING_MODEL = 'custom-embedding-model';
      const provider = new GeminiEmbeddingProvider('key', '');
      expect((provider as any).model).toBe('custom-embedding-model');
    });
  });

  describe('EmbeddingService Provider Resolution', () => {
    it('uses custom provider passed in constructor', () => {
      const mockProv = {
        name: 'CustomProv',
        generateEmbedding: vi.fn(),
        generateEmbeddings: vi.fn(),
      };
      const service = new EmbeddingService(mockProv);
      expect(service.providerName).toBe('CustomProv');
    });

    it('defaults to GeminiEmbeddingProvider when LLM_PROVIDER is gemini or unset', () => {
      const orig = process.env.LLM_PROVIDER;
      try {
        process.env.LLM_PROVIDER = 'gemini';
        const service = new EmbeddingService();
        expect(service.providerName).toBe('GeminiEmbeddingProvider');

        delete process.env.LLM_PROVIDER;
        const service2 = new EmbeddingService();
        expect(service2.providerName).toBe('GeminiEmbeddingProvider');
      } finally {
        if (orig) process.env.LLM_PROVIDER = orig;
      }
    });

    it('creates MockEmbeddingProvider when LLM_PROVIDER is mock and no arguments given', () => {
      const orig = process.env.LLM_PROVIDER;
      try {
        process.env.LLM_PROVIDER = 'mock';
        const service = new EmbeddingService();
        expect(service.providerName).toBe('MockEmbeddingProvider');
      } finally {
        if (orig) process.env.LLM_PROVIDER = orig;
      }
    });

    it('delegates generateEmbedding and generateEmbeddings to provider', async () => {
      const mockProv = {
        name: 'Custom',
        generateEmbedding: vi.fn().mockResolvedValue([1, 2, 3]),
        generateEmbeddings: vi.fn().mockResolvedValue([[1, 2, 3]]),
      };
      const service = new EmbeddingService(mockProv);
      const single = await service.generateEmbedding('text');
      const multiple = await service.generateEmbeddings(['text']);
      expect(single).toEqual([1, 2, 3]);
      expect(multiple).toEqual([[1, 2, 3]]);
    });
  });

  describe('GeminiLLMProvider HTTP and Parsing Resilience', () => {
    it('configures timeoutMs from environment or default', () => {
      process.env.AI_REQUEST_TIMEOUT_MS = '45000';
      const p1 = new GeminiLLMProvider('test-key');
      expect((p1 as any).timeoutMs).toBe(45000);

      delete process.env.AI_REQUEST_TIMEOUT_MS;
      const p2 = new GeminiLLMProvider('test-key');
      expect((p2 as any).timeoutMs).toBe(30000);

      const p3 = new GeminiLLMProvider('test-key', '', 15000);
      expect((p3 as any).timeoutMs).toBe(15000);
    });

    it('handles generateBriefing with empty analysis properties', async () => {
      const gemini = new GeminiLLMProvider('test-key');
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      conciseSummary: 'Standard brief',
                      lawyerChecklist: {
                        questionsToAsk: [],
                        documentsToBring: [],
                        importantDeadlines: [],
                        keyConcerns: [],
                        clarificationAreas: [],
                      },
                      actionChecklist: [],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      });

      const brief = await gemini.generateBriefing('Bare Agreement', {});
      expect(brief.conciseSummary).toBe('Standard brief');
    });

    it('handles HTTP 400 and throws AIServiceError with diagnostics', async () => {
      const gemini = new GeminiLLMProvider('test-key');
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Invalid payload' } }),
      });

      await expect((gemini as any).callGeminiApi('test')).rejects.toThrow(
        'Gemini generation API error (model: gemini-3.6-flash, status: 400): Invalid payload'
      );
    });

    it('handles HTTP 401 and 403 auth errors with diagnostics', async () => {
      const gemini = new GeminiLLMProvider('test-key');
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'API key expired' } }),
      });
      await expect((gemini as any).callGeminiApi('test')).rejects.toThrow(
        'Gemini generation API authentication failed (model: gemini-3.6-flash, status: 401): API key expired'
      );

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: { message: 'Forbidden' } }),
      });
      await expect((gemini as any).callGeminiApi('test')).rejects.toThrow(
        'Gemini generation API authentication failed (model: gemini-3.6-flash, status: 403): Forbidden'
      );
    });

    it('handles HTTP 404 model not found with diagnostics', async () => {
      const gemini = new GeminiLLMProvider('test-key');
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: { message: 'Model not found' } }),
      });
      await expect((gemini as any).callGeminiApi('test')).rejects.toThrow(
        'Gemini generation model was not found (model: gemini-3.6-flash, status: 404): Model not found'
      );
    });

    it('handles HTTP 429 rate limit error with diagnostics', async () => {
      const gemini = new GeminiLLMProvider('test-key');
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'Exhausted quota' } }),
      });
      await expect((gemini as any).callGeminiApi('test')).rejects.toThrow(
        'Gemini generation API rate limit exceeded (model: gemini-3.6-flash, status: 429): Exhausted quota'
      );
    });

    it('handles HTTP 500+ server errors with diagnostics', async () => {
      const gemini = new GeminiLLMProvider('test-key');
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: { message: 'High demand' } }),
      });
      await expect((gemini as any).callGeminiApi('test')).rejects.toThrow(
        'Gemini generation service is temporarily unavailable (model: gemini-3.6-flash, status: 503): High demand'
      );

      // Fallback to statusText when json throws
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: async () => { throw new Error('Not JSON'); },
      });
      await expect((gemini as any).callGeminiApi('test')).rejects.toThrow(
        'Gemini generation service is temporarily unavailable (model: gemini-3.6-flash, status: 502): Bad Gateway'
      );

      // Fallback when json has no error.message
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ rawFailure: 'Something broke' }),
      });
      await expect((gemini as any).callGeminiApi('test')).rejects.toThrow(
        'Gemini generation service is temporarily unavailable (model: gemini-3.6-flash, status: 500): {"rawFailure":"Something broke"}'
      );

      // Fallback when json throws and statusText is empty
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: '',
        json: async () => { throw new Error('Not JSON'); },
      });
      await expect((gemini as any).callGeminiApi('test')).rejects.toThrow(
        'Gemini generation service is temporarily unavailable (model: gemini-3.6-flash, status: 502): Unknown error'
      );
    });

    it('handles extractJson when string has no outer braces', () => {
      const gemini = new GeminiLLMProvider('test-key');
      const res = (gemini as any).extractJson('plain unbraced text');
      expect(res).toBe('plain unbraced text');
    });

    it('handles retry logic in parseAndValidate when first attempt is malformed', async () => {
      const gemini = new GeminiLLMProvider('test-key');
      const chunks = [
        new DocumentChunk({
          id: 'c1',
          documentId: 'd1',
          chunkIndex: 0,
          pageNumber: 1,
          sectionHeading: 'Terms',
          content: 'This contract can be terminated with 30 days notice.',
          tokenCount: 10,
        }),
      ];

      // First call returns bad JSON, second retryCall returns valid JSON
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: true,
            json: async () => ({
              candidates: [{ content: { parts: [{ text: 'NOT VALID JSON' }] } }],
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        shortAnswer: 'Yes, 30 days notice.',
                        whatTheDocumentSays: 'Termination clause specifies 30 days.',
                        whyItMatters: 'Standard notice period.',
                        sourceCitations: [
                          {
                            chunkId: 'c1',
                            pageNumber: 1,
                            sectionHeading: 'Terms',
                            textSnippet: 'terminated with 30 days notice',
                          },
                        ],
                        questionsForLawyer: [],
                        grounded: true,
                      }),
                    },
                  ],
                },
              },
            ],
          }),
        };
      });

      const res = await gemini.answerGroundedQuestion('Can I terminate?', chunks);
      expect(res.grounded).toBe(true);
      expect(res.shortAnswer).toBe('Yes, 30 days notice.');
      expect(res.sourceCitations).toHaveLength(1);
    });

    it('throws AIServiceUnavailableError when retry also fails in parseAndValidate', async () => {
      const gemini = new GeminiLLMProvider('test-key');
      const chunks = [
        new DocumentChunk({
          id: 'c1',
          documentId: 'd1',
          chunkIndex: 0,
          pageNumber: 1,
          sectionHeading: 'Terms',
          content: 'Text',
          tokenCount: 1,
        }),
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'INVALID FOREVER' }] } }],
        }),
      });

      await expect(gemini.answerGroundedQuestion('Can I terminate?', chunks)).rejects.toThrow(
        'Failed to generate valid legal analysis from AI service.'
      );
    });

    it('filters out citations that do not match any retrieved chunk or snippet', async () => {
      const gemini = new GeminiLLMProvider('test-key');
      const chunks = [
        new DocumentChunk({
          id: 'c1',
          documentId: 'd1',
          chunkIndex: 0,
          pageNumber: 1,
          sectionHeading: 'Terms',
          content: 'Payment is due within 30 days.',
          tokenCount: 6,
        }),
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      shortAnswer: 'Payment terms apply.',
                      whatTheDocumentSays: 'Document specifies payment.',
                      whyItMatters: 'Cash flow.',
                      sourceCitations: [
                        // Citation 1: chunkId matches, snippet matches
                        {
                          chunkId: 'c1',
                          pageNumber: 1,
                          sectionHeading: 'Terms',
                          textSnippet: 'Payment is due',
                        },
                        // Citation 2: nonexistent chunkId
                        {
                          chunkId: 'c999',
                          pageNumber: 99,
                          sectionHeading: 'Unknown',
                          textSnippet: 'Ghost chunk',
                        },
                        // Citation 3: matching chunkId, empty snippet fallback
                        {
                          chunkId: 'c1',
                          pageNumber: 1,
                          sectionHeading: 'Terms',
                          textSnippet: '',
                        },
                        // Citation 4: whitespace snippet
                        {
                          chunkId: 'c1',
                          pageNumber: 1,
                          sectionHeading: 'Terms',
                          textSnippet: '   ',
                        },
                        // Citation 5: non matching snippet
                        {
                          chunkId: 'c1',
                          pageNumber: 1,
                          sectionHeading: 'Terms',
                          textSnippet: 'completely missing phrase from chunk',
                        },
                      ],
                      questionsForLawyer: [],
                      grounded: true,
                    }),
                  },
                ],
              },
            },
          ],
        }),
      });

      const res = await gemini.answerGroundedQuestion('What are the payment terms?', chunks);
      expect(res.grounded).toBe(true);
      expect(res.sourceCitations).toHaveLength(3);
      expect(res.sourceCitations[0].chunkId).toBe('c1');
      expect(res.sourceCitations[1].textSnippet).toBe('Payment is due within 30 days.');
      expect(res.sourceCitations[2].textSnippet).toBe('   ');
    });

    it('returns ungrounded answer immediately when contextChunks is empty', async () => {
      const gemini = new GeminiLLMProvider('test-key');
      const res = await gemini.answerGroundedQuestion('What are the rules?', []);
      expect(res.grounded).toBe(false);
      expect(res.shortAnswer).toContain("couldn't find enough information");
      expect(res.sourceCitations).toHaveLength(0);
      expect(res.groundingConfidence).toBe(0);
    });

    it('handles ungrounded answer when model indicates not grounded', async () => {
      const gemini = new GeminiLLMProvider('test-key');
      const chunks = [
        new DocumentChunk({
          id: 'c1',
          documentId: 'd1',
          chunkIndex: 0,
          pageNumber: 1,
          sectionHeading: 'Terms',
          content: 'General words.',
          tokenCount: 2,
        }),
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      shortAnswer: "I couldn't find enough information in the document to answer that confidently.",
                      whatTheDocumentSays: 'Not mentioned.',
                      whyItMatters: 'Need more data.',
                      sourceCitations: [],
                      questionsForLawyer: ['Ask the lawyer'],
                      grounded: false,
                    }),
                  },
                ],
              },
            },
          ],
        }),
      });

      const res = await gemini.answerGroundedQuestion('What is the secret code?', chunks);
      expect(res.grounded).toBe(false);
      expect(res.groundingConfidence).toBe(0);
      expect(res.sourceCitations).toHaveLength(0);
    });
    it('maps generic network exception in callGeminiApi to AIServiceUnavailableError', async () => {
      const gemini = new GeminiLLMProvider('test-key');
      global.fetch = vi.fn().mockRejectedValue(new Error('Network reset'));
      await expect((gemini as any).callGeminiApi('test')).rejects.toThrow(
        'AI service is temporarily unavailable. Please try again.'
      );
    });

    it('throws AIServiceUnavailableError directly when parseAndValidate fails without retryCall', async () => {
      const gemini = new GeminiLLMProvider('test-key');
      const dummySchema = (await import('zod')).z.object({ field: (await import('zod')).z.string() });
      await expect((gemini as any).parseAndValidate('invalid text', dummySchema)).rejects.toThrow(
        'Failed to generate valid legal analysis from AI service.'
      );
    });
  });

  describe('OpenAILLMProvider Error & Edge Cases', () => {
    it('handles HTTP 429 in OpenAILLMProvider', async () => {
      const openai = new OpenAILLMProvider('test-key');
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      });

      await expect((openai as any).callOpenAiApi('test')).rejects.toThrow(RateLimitError);
    });

    it('throws AIServiceUnavailableError when briefing response fails JSON parsing in OpenAI', async () => {
      const openai = new OpenAILLMProvider('test-key');
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'NOT JSON' } }],
        }),
      });

      await expect(openai.generateBriefing('Doc', {})).rejects.toThrow(
        'Failed to generate valid briefing from AI service.'
      );
    });

    it('throws AIServiceUnavailableError when generateAnalysis fails JSON parsing in OpenAI', async () => {
      const openai = new OpenAILLMProvider('test-key');
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'NOT JSON' } }],
        }),
      });

      await expect(openai.generateAnalysis('Doc', 'Text', [])).rejects.toThrow(
        'Failed to generate valid legal analysis from AI service.'
      );
    });

    it('throws AIServiceUnavailableError when generateComparison fails JSON parsing in OpenAI', async () => {
      const openai = new OpenAILLMProvider('test-key');
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'NOT JSON' } }],
        }),
      });

      await expect(
        openai.generateComparison({ title: 'A', text: 'A' }, { title: 'B', text: 'B' })
      ).rejects.toThrow('Failed to generate valid comparison from AI service.');
    });

    it('throws AIServiceUnavailableError when answerGroundedQuestion fails JSON parsing in OpenAI', async () => {
      const openai = new OpenAILLMProvider('test-key');
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'NOT JSON' } }],
        }),
      });

      await expect(openai.answerGroundedQuestion('Q', [])).rejects.toThrow(
        'Failed to generate valid answer from AI service.'
      );
    });
  });

  describe('LLMProviderFactory default environment fallback', () => {
    it('creates GeminiLLMProvider when providerType is undefined and process.env.LLM_PROVIDER is unset', () => {
      const orig = process.env.LLM_PROVIDER;
      try {
        delete process.env.LLM_PROVIDER;
        const provider = LLMProviderFactory.create();
        expect(provider.name).toBe('GeminiLLMProvider');
      } finally {
        if (orig) process.env.LLM_PROVIDER = orig;
      }
    });
  });

  describe('PromptSecurityService edge case handling', () => {
    it('returns empty string when sanitizeRetrievedContext is given falsy input', () => {
      const security = new PromptSecurityService();
      expect(security.sanitizeRetrievedContext('')).toBe('');
      expect(security.sanitizeRetrievedContext(null as any)).toBe('');
    });
  });

  describe('Domain Errors default parameters', () => {
    it('instantiates AIServiceError with default parameters', () => {
      const err = new AIServiceError();
      expect(err.message).toBe('AI service encountered an error.');
      expect(err.statusCode).toBe(502);
      expect(err.code).toBe('AI_SERVICE_ERROR');
    });
  });

  describe('ReindexDocumentUseCase', () => {
    it('throws NotFoundError when document does not exist', async () => {
      const docRepo = { findById: vi.fn().mockResolvedValue(null) } as any;
      const vectorStore = { searchKeyword: vi.fn(), upsertChunks: vi.fn() } as any;
      const embService = { generateEmbeddings: vi.fn() } as any;

      const useCase = new ReindexDocumentUseCase(docRepo, vectorStore, embService);
      await expect(useCase.execute('missing-id', 'u1')).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError when document is not owned by user', async () => {
      const doc = new LegalDocument({
        id: 'd1',
        userId: 'owner-id',
        title: 'Title',
        originalFilename: 'file.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 100,
        storagePath: '/data/file.pdf',
        pageCount: 1,
        characterCount: 50,
        status: 'ready',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const docRepo = { findById: vi.fn().mockResolvedValue(doc) } as any;
      const vectorStore = { searchKeyword: vi.fn(), upsertChunks: vi.fn() } as any;
      const embService = { generateEmbeddings: vi.fn() } as any;

      const useCase = new ReindexDocumentUseCase(docRepo, vectorStore, embService);
      await expect(useCase.execute('d1', 'different-user')).rejects.toThrow(ForbiddenError);
    });

    it('returns 0 when document has no chunks to reindex', async () => {
      const doc = new LegalDocument({
        id: 'd1',
        userId: 'u1',
        title: 'Title',
        originalFilename: 'file.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 100,
        storagePath: '/data/file.pdf',
        pageCount: 1,
        characterCount: 50,
        status: 'ready',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const docRepo = { findById: vi.fn().mockResolvedValue(doc) } as any;
      const vectorStore = { searchKeyword: vi.fn().mockResolvedValue([]), upsertChunks: vi.fn() } as any;
      const embService = { generateEmbeddings: vi.fn() } as any;

      const useCase = new ReindexDocumentUseCase(docRepo, vectorStore, embService);
      const count = await useCase.execute('d1', 'u1');
      expect(count).toBe(0);
      expect(embService.generateEmbeddings).not.toHaveBeenCalled();
    });

    it('reindexes chunks with new embeddings and upserts to vectorStore', async () => {
      const doc = new LegalDocument({
        id: 'd1',
        userId: 'u1',
        title: 'Title',
        originalFilename: 'file.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 100,
        storagePath: '/data/file.pdf',
        pageCount: 1,
        characterCount: 50,
        status: 'ready',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const chunk1 = new DocumentChunk({
        id: 'c1',
        documentId: 'd1',
        chunkIndex: 0,
        pageNumber: 1,
        sectionHeading: 'Sec 1',
        content: 'Content 1',
        tokenCount: 2,
      });
      const chunk2 = new DocumentChunk({
        id: 'c2',
        documentId: 'd1',
        chunkIndex: 1,
        pageNumber: 2,
        sectionHeading: 'Sec 2',
        content: 'Content 2',
        tokenCount: 2,
      });

      const docRepo = { findById: vi.fn().mockResolvedValue(doc) } as any;
      const vectorStore = {
        searchKeyword: vi.fn().mockResolvedValue([chunk1, chunk2]),
        upsertChunks: vi.fn().mockResolvedValue(undefined),
      } as any;
      const embService = {
        generateEmbeddings: vi.fn().mockResolvedValue([[0.1, 0.2], [0.3, 0.4]]),
      } as any;

      const useCase = new ReindexDocumentUseCase(docRepo, vectorStore, embService);
      const count = await useCase.execute('d1', 'u1');
      expect(count).toBe(2);
      expect(chunk1.embedding).toEqual([0.1, 0.2]);
      expect(chunk2.embedding).toEqual([0.3, 0.4]);
      expect(vectorStore.upsertChunks).toHaveBeenCalledWith([chunk1, chunk2]);
    });
  });

  describe('ChatUseCases duplicate chunk deduplication', () => {
    it('deduplicates chunks when vector search returns duplicate chunk ids', async () => {
      const docRepo = {
        findById: vi.fn().mockResolvedValue(
          new LegalDocument({
            id: 'd1',
            userId: 'u1',
            title: 'Doc',
            originalFilename: 'doc.pdf',
            mimeType: 'application/pdf',
            fileSizeBytes: 100,
            storagePath: '/data/doc.pdf',
            pageCount: 1,
            characterCount: 50,
            status: 'ready',
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ),
      } as any;
      const chatRepo = {
        saveMessage: vi.fn().mockResolvedValue(undefined),
      } as any;

      const dupChunk = new DocumentChunk({
        id: 'dup-1',
        documentId: 'd1',
        chunkIndex: 0,
        pageNumber: 1,
        sectionHeading: 'Sec',
        content: 'Duplicate text',
        tokenCount: 2,
      });

      const vectorStore = {
        searchSimilar: vi.fn().mockResolvedValue([
          { chunk: dupChunk, score: 0.9 },
          { chunk: dupChunk, score: 0.85 }, // Duplicate!
        ]),
      } as any;

      const embeddingService = {
        generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2]),
      } as any;

      const llmProvider = {
        answerGroundedQuestion: vi.fn().mockResolvedValue({
          shortAnswer: 'Answered',
          whatTheDocumentSays: 'Says',
          whyItMatters: 'Matters',
          sourceCitations: [],
          questionsForLawyer: [],
          grounded: true,
        }),
      } as any;

      const useCase = new AskDocumentChatUseCase(docRepo, chatRepo, vectorStore, embeddingService, llmProvider);
      await useCase.execute({
        documentId: 'd1',
        userId: 'u1',
        question: 'What is this?',
      });

      // Assert answerGroundedQuestion was passed exactly 1 chunk, not 2
      expect(llmProvider.answerGroundedQuestion).toHaveBeenCalledWith(
        'What is this?',
        [dupChunk]
      );
    });
  });

  describe('Presentation Routes Rate Limit Middleware Branching', () => {
    const mockAuth = (_req: any, _res: any, next: any) => next();

    it('constructs routes without rate limit middleware', () => {
      const mockAnalysisCtrl = { analyze: vi.fn(), getAnalysis: vi.fn() } as any;
      const analysisRouter = createAnalysisRoutes(mockAnalysisCtrl, mockAuth);
      expect(analysisRouter).toBeDefined();

      const mockBriefingCtrl = {
        getBriefing: vi.fn(),
        toggleChecklistItem: vi.fn(),
        exportMarkdown: vi.fn(),
      } as any;
      const briefingRouter = createBriefingRoutes(mockBriefingCtrl, mockAuth);
      expect(briefingRouter).toBeDefined();

      const mockChatCtrl = {
        ask: vi.fn(),
        getHistory: vi.fn(),
        clearHistory: vi.fn(),
      } as any;
      const chatRouter = createChatRoutes(mockChatCtrl, mockAuth);
      expect(chatRouter).toBeDefined();

      const mockCompCtrl = {
        compare: vi.fn(),
        list: vi.fn(),
        getById: vi.fn(),
      } as any;
      const compRouter = createComparisonRoutes(mockCompCtrl, mockAuth);
      expect(compRouter).toBeDefined();
    });
  });

  describe('VectorStore Dimension Mismatch and Incompatible Embedding Invalidation', () => {
    it('invalidates chunk with incompatible vector dimensions during searchSimilar', async () => {
      const appDb = new AppDatabase(':memory:');
      const store = new VectorStore(appDb.connection);
      const now = new Date().toISOString();

      await appDb.connection.run(
        'INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['u1', 'u1@example.com', 'hash', 'User 1', now, now]
      );
      await appDb.connection.run(
        'INSERT INTO documents (id, user_id, title, original_filename, mime_type, file_size_bytes, storage_path, page_count, character_count, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ['doc-dim-test', 'u1', 'Title', 'f.pdf', 'application/pdf', 100, '/data/f.pdf', 1, 100, 'ready', now, now]
      );

      const chunk64 = new DocumentChunk({
        id: 'chunk-64',
        documentId: 'doc-dim-test',
        chunkIndex: 0,
        pageNumber: 1,
        sectionHeading: 'Heading',
        content: 'Old clause content with 64-dim embedding',
        tokenCount: 10,
        embedding: new Array(64).fill(0.1),
      });

      const chunk3072 = new DocumentChunk({
        id: 'chunk-3072',
        documentId: 'doc-dim-test',
        chunkIndex: 1,
        pageNumber: 1,
        sectionHeading: 'Heading',
        content: 'New clause content with 3072-dim embedding',
        tokenCount: 10,
        embedding: new Array(3072).fill(0.01),
      });

      await store.upsertChunks([chunk64, chunk3072]);

      const query3072 = new Array(3072).fill(0.01);
      const results = await store.searchSimilar('doc-dim-test', query3072, 10);

      expect(results).toHaveLength(2);
      // chunk-3072 should match with high similarity
      const res3072 = results.find((r) => r.chunk.id === 'chunk-3072');
      expect(res3072?.score).toBeGreaterThan(0.99);

      // chunk-64 should have score 0 because dimension mismatched and got invalidated
      const res64 = results.find((r) => r.chunk.id === 'chunk-64');
      expect(res64?.score).toBe(0);

      // Verify that chunk-64 was set to NULL in DB
      const row = (await appDb.connection.get('SELECT embedding FROM document_chunks WHERE id = ?', ['chunk-64'])) as any;
      expect(row.embedding).toBeNull();

      appDb.close();
    });

    it('invalidates incompatible and malformed embeddings via invalidateIncompatibleEmbeddings', async () => {
      const appDb = new AppDatabase(':memory:');
      const store = new VectorStore(appDb.connection);
      const now = new Date().toISOString();

      await appDb.connection.run(
        'INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['u2', 'u2@example.com', 'hash', 'User 2', now, now]
      );
      await appDb.connection.run(
        'INSERT INTO documents (id, user_id, title, original_filename, mime_type, file_size_bytes, storage_path, page_count, character_count, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ['doc-inv-test', 'u2', 'Title', 'f.pdf', 'application/pdf', 100, '/data/f.pdf', 1, 100, 'ready', now, now]
      );

      const chunkOld = new DocumentChunk({
        id: 'chunk-old',
        documentId: 'doc-inv-test',
        chunkIndex: 0,
        pageNumber: 1,
        sectionHeading: 'Heading',
        content: 'Old 64 dim',
        tokenCount: 5,
        embedding: new Array(64).fill(0.05),
      });

      const chunkValid = new DocumentChunk({
        id: 'chunk-valid',
        documentId: 'doc-inv-test',
        chunkIndex: 1,
        pageNumber: 1,
        sectionHeading: 'Heading',
        content: 'Valid 3072 dim',
        tokenCount: 5,
        embedding: new Array(3072).fill(0.05),
      });

      await store.upsertChunks([chunkOld, chunkValid]);

      // Manually insert a malformed non-JSON embedding to verify catch block
      await appDb.connection.run(
        'INSERT INTO document_chunks (id, document_id, chunk_index, page_number, section_heading, content, token_count, embedding) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['chunk-corrupt', 'doc-inv-test', 2, 1, 'H', 'corrupt', 1, '{not valid json}']
      );

      // Invalidate everything not 3072
      const count = await store.invalidateIncompatibleEmbeddings(3072);
      expect(count).toBe(2); // chunk-old and chunk-corrupt

      const validRow = (await appDb.connection.get('SELECT embedding FROM document_chunks WHERE id = ?', ['chunk-valid'])) as any;
      expect(JSON.parse(validRow.embedding)).toHaveLength(3072);

      const oldRow = (await appDb.connection.get('SELECT embedding FROM document_chunks WHERE id = ?', ['chunk-old'])) as any;
      expect(oldRow.embedding).toBeNull();

      const corruptRow = (await appDb.connection.get('SELECT embedding FROM document_chunks WHERE id = ?', ['chunk-corrupt'])) as any;
      expect(corruptRow.embedding).toBeNull();

      appDb.close();
    });
  });

  describe('End-to-End Briefing Flow with Real Gemini Provider', () => {
    it('generates, caches, and returns legal briefing from document analysis', async () => {
      const doc = new LegalDocument({
        id: 'doc-brief-flow',
        userId: 'user-flow',
        title: 'Commercial Lease Agreement',
        originalFilename: 'lease.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 1000,
        storagePath: '/data/lease.pdf',
        pageCount: 2,
        characterCount: 500,
        status: 'ready',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const analysis = new DocumentAnalysis({
        id: 'anl-brief-flow',
        documentId: 'doc-brief-flow',
        documentType: 'Commercial Lease',
        partiesInvolved: ['Landlord LLC', 'Tenant Inc'],
        effectiveDate: '2026-01-01',
        expirationDate: '2027-01-01',
        jurisdiction: 'New York',
        highLevelSummary: 'Lease for commercial premises',
        plainLanguageSummary: {
          whatThisDocumentIsAbout: 'Lease agreement',
          whatYouAreAgreeingTo: ['Pay rent'],
          whatTheOtherPartyIsAgreeingTo: ['Provide space'],
          yourKeyResponsibilities: ['Maintenance'],
          yourRights: ['Quiet enjoyment'],
          importantDates: ['First of each month'],
          financialObligations: ['$5,000/mo'],
          terminationConditions: ['30 days notice'],
        },
        extractedFacts: [],
        clauses: [],
        findings: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      let savedBriefing: any = null;
      const docRepo = {
        findById: vi.fn().mockResolvedValue(doc),
      } as any;
      const briefingRepo = {
        findByDocumentId: vi.fn().mockImplementation(() => Promise.resolve(savedBriefing)),
        save: vi.fn().mockImplementation((b) => {
          savedBriefing = b;
          return Promise.resolve();
        }),
      } as any;
      const analysisRepo = {
        findByDocumentId: vi.fn().mockResolvedValue(analysis),
      } as any;
      const analyzeDocUseCase = {
        execute: vi.fn().mockResolvedValue(analysis),
      } as any;

      const gemini = new GeminiLLMProvider('test-api-key');

      // Mock Gemini generateContent API response for briefing
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      conciseSummary: 'Commercial Lease briefing preparation aid.',
                      lawyerChecklist: {
                        questionsToAsk: ['Is there an early termination fee?'],
                        documentsToBring: ['Lease copy', 'Rent receipts'],
                        importantDeadlines: ['Notice by Nov 1'],
                        keyConcerns: ['Uncapped maintenance liability'],
                        clarificationAreas: ['Sublease restrictions'],
                      },
                      actionChecklist: [
                        { id: 'act-1', label: 'Clarify sublease clause', category: 'questionsToAsk', completed: false },
                      ],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      });

      const generateUseCase = new GenerateLegalBriefingUseCase(
        docRepo,
        briefingRepo,
        analysisRepo,
        analyzeDocUseCase,
        gemini
      );

      const getUseCase = new GetLegalBriefingUseCase(docRepo, briefingRepo, generateUseCase);

      // First call generates via Gemini
      const briefing1 = await getUseCase.execute('doc-brief-flow', 'user-flow');
      expect(briefing1.conciseSummary).toBe('Commercial Lease briefing preparation aid.');
      expect(briefing1.lawyerChecklist.questionsToAsk).toContain('Is there an early termination fee?');
      expect(briefing1.actionChecklist).toHaveLength(1);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call retrieves cached briefing without calling Gemini
      const briefing2 = await getUseCase.execute('doc-brief-flow', 'user-flow');
      expect(briefing2.id).toBe(briefing1.id);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
