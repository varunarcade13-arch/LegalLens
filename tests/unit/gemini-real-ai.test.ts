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
import { ChatMessage } from '../../src/core/domain/ChatMessage';
import {
  AIServiceError,
  AIServiceUnavailableError,
  RateLimitError,
  NotFoundError,
  ForbiddenError,
} from '../../src/core/domain/Errors';
import { createAnalysisRoutes } from '../../src/presentation/routes/analysisRoutes';
import { createBriefingRoutes } from '../../src/presentation/routes/briefingRoutes';
import { createChatRoutes } from '../../src/presentation/routes/chatRoutes';
import { createComparisonRoutes } from '../../src/presentation/routes/comparisonRoutes';

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
      expect((provider as any).model).toBe('text-embedding-004');
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

    it('returns 768 zero values for empty or whitespace text', async () => {
      const provider = new GeminiEmbeddingProvider('test-key');
      const res = await provider.generateEmbedding('   ');
      expect(res).toHaveLength(768);
      expect(res.every((v) => v === 0)).toBe(true);
    });

    it('returns empty array when generateEmbeddings is called with empty list', async () => {
      const provider = new GeminiEmbeddingProvider('test-key');
      const res = await provider.generateEmbeddings([]);
      expect(res).toEqual([]);
    });

    it('successfully generates embeddings via Gemini API', async () => {
      const provider = new GeminiEmbeddingProvider('test-key');
      const fakeEmbedding = [0.1, 0.2, 0.3];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: { values: fakeEmbedding },
        }),
      });

      const res = await provider.generateEmbedding('clause content');
      expect(res).toEqual(fakeEmbedding);
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
      const res = await provider.generateEmbeddings(texts);
      expect(res).toHaveLength(20);
      expect(global.fetch).toHaveBeenCalledTimes(20);
    });

    it('handles 429 rate limit error in generateEmbedding', async () => {
      const provider = new GeminiEmbeddingProvider('test-key');
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      });

      await expect(provider.generateEmbedding('test')).rejects.toThrow(RateLimitError);
    });

    it('handles non-ok HTTP status in generateEmbedding', async () => {
      const provider = new GeminiEmbeddingProvider('test-key');
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(provider.generateEmbedding('test')).rejects.toThrow(
        'Gemini embedding API error: 500'
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
      process.env.LLM_PROVIDER = 'gemini';
      const service = new EmbeddingService();
      expect(service.providerName).toBe('GeminiEmbeddingProvider');

      delete process.env.LLM_PROVIDER;
      const service2 = new EmbeddingService();
      expect(service2.providerName).toBe('GeminiEmbeddingProvider');
    });

    it('creates MockEmbeddingProvider when LLM_PROVIDER is mock and no arguments given', () => {
      process.env.LLM_PROVIDER = 'mock';
      const service = new EmbeddingService();
      expect(service.providerName).toBe('MockEmbeddingProvider');
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

    it('handles HTTP 400 and throws AIServiceError', async () => {
      const gemini = new GeminiLLMProvider('test-key');
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
      });

      await expect((gemini as any).callGeminiApi('test')).rejects.toThrow(AIServiceError);
    });

    it('handles HTTP 401 and 403 auth errors', async () => {
      const gemini = new GeminiLLMProvider('test-key');
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
      });
      await expect((gemini as any).callGeminiApi('test')).rejects.toThrow(
        'AI service authentication failed.'
      );

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
      });
      await expect((gemini as any).callGeminiApi('test')).rejects.toThrow(
        'AI service authentication failed.'
      );
    });

    it('handles HTTP 404 model not found', async () => {
      const gemini = new GeminiLLMProvider('test-key');
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });
      await expect((gemini as any).callGeminiApi('test')).rejects.toThrow(
        'Configured Gemini model was not found.'
      );
    });

    it('handles HTTP 429 rate limit error', async () => {
      const gemini = new GeminiLLMProvider('test-key');
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      });
      await expect((gemini as any).callGeminiApi('test')).rejects.toThrow(RateLimitError);
    });

    it('handles HTTP 500+ server errors', async () => {
      const gemini = new GeminiLLMProvider('test-key');
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      });
      await expect((gemini as any).callGeminiApi('test')).rejects.toThrow(
        'Gemini service is temporarily unavailable. Please try again.'
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
      delete process.env.LLM_PROVIDER;
      const provider = LLMProviderFactory.create();
      expect(provider.name).toBe('GeminiLLMProvider');
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
        filename: 'file.pdf',
        fileType: 'pdf',
        fileSize: 100,
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
        filename: 'file.pdf',
        fileType: 'pdf',
        fileSize: 100,
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
        filename: 'file.pdf',
        fileType: 'pdf',
        fileSize: 100,
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
            filename: 'doc.pdf',
            fileType: 'pdf',
            fileSize: 100,
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
});
