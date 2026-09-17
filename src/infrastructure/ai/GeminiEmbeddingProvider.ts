import { IEmbeddingProvider, EmbeddingTaskType } from '../../core/ports';
import { AIServiceUnavailableError, RateLimitError } from '../../core/domain/Errors';

export class GeminiEmbeddingProvider implements IEmbeddingProvider {
  public readonly name: string = 'GeminiEmbeddingProvider';
  private apiKey: string;
  private model: string;
  private timeoutMs: number;

  constructor(
    apiKey: string = '',
    model: string = '',
    timeoutMs: number = 30000
  ) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    this.model = model || process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
    this.timeoutMs = timeoutMs;
  }

  public async generateEmbedding(text: string, taskType?: EmbeddingTaskType): Promise<number[]> {
    if (!this.apiKey) {
      throw new AIServiceUnavailableError('Gemini API key is not configured for embeddings.');
    }

    if (!text || text.trim().length === 0) {
      return new Array(3072).fill(0);
    }

    const truncated = text.substring(0, 10000);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:embedContent`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify({
          model: `models/${this.model}`,
          content: { parts: [{ text: truncated }] },
          taskType: taskType || 'RETRIEVAL_DOCUMENT',
        }),
        signal: controller.signal,
      });
    } catch {
      clearTimeout(timeoutId);
      throw new AIServiceUnavailableError('AI service is temporarily unavailable. Please try again.');
    }
    clearTimeout(timeoutId);

    if (!res.ok) {
      let errorDetail = '';
      try {
        const errJson = (await res.json()) as any;
        errorDetail = errJson?.error?.message || JSON.stringify(errJson);
      } catch {
        errorDetail = res.statusText || 'Unknown error';
      }

      if (res.status === 429) {
        throw new RateLimitError(`Gemini embedding API rate limit exceeded (model: ${this.model}, status: 429): ${errorDetail}`);
      }
      throw new AIServiceUnavailableError(`Gemini embedding API error (model: ${this.model}, status: ${res.status}): ${errorDetail}`);
    }

    const data = (await res.json()) as any;
    const values = data?.embedding?.values;
    if (!Array.isArray(values) || values.length === 0 || !values.every((v) => typeof v === 'number' && Number.isFinite(v))) {
      throw new AIServiceUnavailableError('Malformed embedding response from Gemini API.');
    }

    return values;
  }

  public async generateEmbeddings(texts: string[], taskType?: EmbeddingTaskType): Promise<number[][]> {
    if (!this.apiKey) {
      throw new AIServiceUnavailableError('Gemini API key is not configured for embeddings.');
    }

    if (!texts || texts.length === 0) {
      return [];
    }

    const results: number[][] = [];
    // Process in batches of 16 to avoid exceeding API payload limits
    const batchSize = 16;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map((t) => this.generateEmbedding(t, taskType));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }
}

