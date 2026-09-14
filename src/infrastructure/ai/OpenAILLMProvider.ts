import { DocumentAnalysisProps } from '../../core/domain/DocumentAnalysis';
import { ComparisonProps } from '../../core/domain/Comparison';
import { StructuredAnswer } from '../../core/domain/ChatMessage';
import { LegalBriefingProps } from '../../core/domain/LegalBriefing';
import { DocumentChunk } from '../../core/domain/DocumentChunk';
import { ILLMProvider } from '../../core/ports';
import { MockLLMProvider } from './MockLLMProvider';
import { PromptSecurityService } from './PromptSecurityService';

export class OpenAILLMProvider implements ILLMProvider {
  public readonly name: string = 'OpenAILLMProvider';
  private apiKey: string;
  private model: string;
  private fallback: MockLLMProvider;
  private promptSecurity: PromptSecurityService;

  constructor(apiKey: string = '', model: string = 'gpt-4o-mini') {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.model = model;
    this.fallback = new MockLLMProvider();
    this.promptSecurity = new PromptSecurityService();
  }

  public async generateAnalysis(
    documentTitle: string,
    documentText: string,
    chunks: DocumentChunk[]
  ): Promise<Omit<DocumentAnalysisProps, 'id' | 'documentId' | 'createdAt' | 'updatedAt'>> {
    if (!this.apiKey) {
      return this.fallback.generateAnalysis(documentTitle, documentText, chunks);
    }
    try {
      const prompt = `Analyze "${documentTitle}". Return JSON matching schema with documentType, partiesInvolved, highLevelSummary, plainLanguageSummary, extractedFacts, clauses, findings. Content:\n${documentText.substring(0, 10000)}`;
      const response = await this.callOpenAiApi(prompt);
      return JSON.parse(response);
    } catch {
      return this.fallback.generateAnalysis(documentTitle, documentText, chunks);
    }
  }

  public async generateComparison(
    docA: { title: string; text: string },
    docB: { title: string; text: string }
  ): Promise<
    Omit<
      ComparisonProps,
      'id' | 'userId' | 'documentAId' | 'documentBId' | 'documentATitle' | 'documentBTitle' | 'createdAt'
    >
  > {
    if (!this.apiKey) {
      return this.fallback.generateComparison(docA, docB);
    }
    try {
      const prompt = `Compare "${docA.title}" vs "${docB.title}". Return JSON comparison schema.`;
      const response = await this.callOpenAiApi(prompt);
      return JSON.parse(response);
    } catch {
      return this.fallback.generateComparison(docA, docB);
    }
  }

  public async answerGroundedQuestion(
    question: string,
    contextChunks: DocumentChunk[]
  ): Promise<StructuredAnswer> {
    if (!this.apiKey) {
      return this.fallback.answerGroundedQuestion(question, contextChunks);
    }
    try {
      this.promptSecurity.validateUserPrompt(question);
      const contextText = contextChunks.map((c) => c.content).join('\n---\n');
      const prompt = `Question: "${question}"\nContext:\n${contextText}\nReturn JSON with shortAnswer, whatTheDocumentSays, whyItMatters, sourceCitations, questionsForLawyer, grounded.`;
      const response = await this.callOpenAiApi(prompt);
      return JSON.parse(response);
    } catch {
      return this.fallback.answerGroundedQuestion(question, contextChunks);
    }
  }

  public async generateBriefing(
    documentTitle: string,
    analysis: any
  ): Promise<Omit<LegalBriefingProps, 'id' | 'userId' | 'documentId' | 'documentTitle' | 'createdAt' | 'updatedAt'>> {
    return this.fallback.generateBriefing(documentTitle, analysis);
  }

  private async callOpenAiApi(prompt: string): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: this.promptSecurity.getSystemGuardrails() },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI API error: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as any;
    return data?.choices?.[0]?.message?.content || '{}';
  }
}
