import { IEmbeddingProvider, EmbeddingTaskType } from '../../core/ports';

export class MockEmbeddingProvider implements IEmbeddingProvider {
  public readonly name: string = 'MockEmbeddingProvider';
  private dimensions: number;

  constructor(dimensions: number = 64) {
    this.dimensions = dimensions;
  }

  public async generateEmbedding(text: string, _taskType?: EmbeddingTaskType): Promise<number[]> {
    return this.computeVector(text);
  }

  public async generateEmbeddings(texts: string[], _taskType?: EmbeddingTaskType): Promise<number[][]> {
    return texts.map((t) => this.computeVector(t));
  }

  private computeVector(text: string): number[] {
    const vector = new Array(this.dimensions).fill(0);
    if (!text || text.trim().length === 0) {
      return vector;
    }

    const tokens = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    if (tokens.length === 0) {
      return vector;
    }

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const hash = this.hashString(token);
      const index = Math.abs(hash) % this.dimensions;
      const weight = 1.0 + Math.min(token.length / 10, 1.0);
      vector[index] += weight;

      if (i < tokens.length - 1) {
        const bigram = `${token}_${tokens[i + 1]}`;
        const biHash = this.hashString(bigram);
        const biIndex = Math.abs(biHash) % this.dimensions;
        vector[biIndex] += 1.5;
      }
    }

    // L2 Normalize
    let norm = 0;
    for (let i = 0; i < this.dimensions; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);

    if (norm > 0) {
      for (let i = 0; i < this.dimensions; i++) {
        vector[i] = vector[i] / norm;
      }
    }

    return vector;
  }

  private hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) + hash + str.charCodeAt(i);
      hash = hash & hash;
    }
    return hash;
  }
}
