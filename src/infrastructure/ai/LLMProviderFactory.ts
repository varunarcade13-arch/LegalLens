import { ILLMProvider } from '../../core/ports';
import { MockLLMProvider } from './MockLLMProvider';
import { GeminiLLMProvider } from './GeminiLLMProvider';
import { OpenAILLMProvider } from './OpenAILLMProvider';

export class LLMProviderFactory {
  public static create(providerType?: string): ILLMProvider {
    const type = (providerType || process.env.LLM_PROVIDER || 'gemini').toLowerCase();

    switch (type) {
      case 'mock':
        return new MockLLMProvider();
      case 'openai':
        return new OpenAILLMProvider();
      case 'gemini':
      default:
        return new GeminiLLMProvider();
    }
  }
}
