import { IEmbeddingService, IEmbeddingProvider, EmbeddingTaskType } from '../../core/ports';
import { GeminiEmbeddingProvider } from './GeminiEmbeddingProvider';
import { MockEmbeddingProvider } from './MockEmbeddingProvider';

export class EmbeddingService implements IEmbeddingService {
  private provider: IEmbeddingProvider;

  constructor(providerOrDimensions?: IEmbeddingProvider | number) {
    if (typeof providerOrDimensions === 'number') {
      this.provider = new MockEmbeddingProvider(providerOrDimensions);
    } else if (providerOrDimensions) {
      this.provider = providerOrDimensions;
    } else {
      const mode = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
      if (mode === 'mock') {
        this.provider = new MockEmbeddingProvider();
      } else {
        this.provider = new GeminiEmbeddingProvider();
      }
    }
  }

  public get providerName(): string {
    return this.provider.name;
  }

  public async generateEmbedding(text: string, taskType?: EmbeddingTaskType): Promise<number[]> {
    return this.provider.generateEmbedding(text, taskType);
  }

  public async generateEmbeddings(texts: string[], taskType?: EmbeddingTaskType): Promise<number[][]> {
    return this.provider.generateEmbeddings(texts, taskType);
  }
}
