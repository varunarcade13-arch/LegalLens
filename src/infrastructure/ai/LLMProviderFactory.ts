import { ILLMProvider } from '../../core/ports';
import { MockLLMProvider } from './MockLLMProvider';
import { GeminiLLMProvider } from './GeminiLLMProvider';
import { OpenAILLMProvider } from './OpenAILLMProvider';

export class LLMProviderFactory {
  public static create(providerType?: string): ILLMProvider {
    const type = (providerType || process.env.LLM_PROVIDER || 'mock').toLowerCase();

    switch (type) {
      case 'gemini':
        return new GeminiLLMProvider();
      case 'openai':
        return new OpenAILLMProvider();
      case 'mock':
      default:
        return new MockLLMProvider();
    }
  }
}
