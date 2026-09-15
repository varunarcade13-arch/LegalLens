import { DocumentAnalysisProps } from '../../core/domain/DocumentAnalysis';
import { ComparisonProps } from '../../core/domain/Comparison';
import { StructuredAnswer } from '../../core/domain/ChatMessage';
import { LegalBriefingProps } from '../../core/domain/LegalBriefing';
import { DocumentChunk } from '../../core/domain/DocumentChunk';
import {
  ILLMProvider,
  DocumentAnalysisAiSchema,
  ComparisonAiSchema,
  GroundedAnswerAiSchema,
  LawyerBriefingAiSchema,
} from '../../core/ports';
import { AIServiceUnavailableError, RateLimitError } from '../../core/domain/Errors';
import { PromptSecurityService } from './PromptSecurityService';

export class OpenAILLMProvider implements ILLMProvider {
  public readonly name: string = 'OpenAILLMProvider';
  private apiKey: string;
  private model: string;
  private promptSecurity: PromptSecurityService;

  constructor(apiKey: string = '', model: string = 'gpt-4o-mini') {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.model = model;
    this.promptSecurity = new PromptSecurityService();
  }

  public async generateAnalysis(
    documentTitle: string,
    documentText: string,
    _chunks: DocumentChunk[]
  ): Promise<Omit<DocumentAnalysisProps, 'id' | 'documentId' | 'createdAt' | 'updatedAt'>> {
    if (!this.apiKey) {
      throw new AIServiceUnavailableError('OpenAI API key is not configured.');
    }
    const prompt = `Analyze "${documentTitle}". Return JSON matching schema with documentType, partiesInvolved, highLevelSummary, plainLanguageSummary, extractedFacts, clauses, findings. Content:\n${documentText.substring(0, 10000)}`;
    const response = await this.callOpenAiApi(prompt);
    try {
      const parsed = JSON.parse(response);
      const validated = DocumentAnalysisAiSchema.parse(parsed);
      return {
        documentType: validated.documentType,
        partiesInvolved: validated.partiesInvolved,
        effectiveDate: validated.effectiveDate,
        expirationDate: validated.expirationDate,
        jurisdiction: validated.jurisdiction,
        highLevelSummary: validated.highLevelSummary,
        plainLanguageSummary: {
          whatThisDocumentIsAbout: validated.plainLanguageSummary.whatThisDocumentIsAbout,
          whatYouAreAgreeingTo: validated.plainLanguageSummary.whatYouAreAgreeingTo,
          whatTheOtherPartyIsAgreeingTo: validated.plainLanguageSummary.whatTheOtherPartyIsAgreeingTo,
          yourKeyResponsibilities: validated.plainLanguageSummary.yourKeyResponsibilities,
          yourRights: validated.plainLanguageSummary.yourRights,
          importantDates: validated.plainLanguageSummary.importantDates,
          financialObligations: validated.plainLanguageSummary.financialObligations,
          terminationConditions: validated.plainLanguageSummary.terminationConditions,
        },
        extractedFacts: validated.extractedFacts.map((f) => ({
          ...f,
          pageNumber: f.pageNumber,
        })),
        clauses: validated.clauses as any,
        findings: validated.findings as any,
      };
    } catch {
      throw new AIServiceUnavailableError('Failed to generate valid legal analysis from AI service.');
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
      throw new AIServiceUnavailableError('OpenAI API key is not configured.');
    }
    const prompt = `Compare "${docA.title}" vs "${docB.title}". Return JSON comparison schema with executiveSummary, addedClauses, removedClauses, modifiedClauses, changedObligations, changedFinancialTerms, changedDates, changedTermination, changedLiability, changedDisputeResolution. Content A:\n${docA.text.substring(0, 5000)}\nContent B:\n${docB.text.substring(0, 5000)}`;
    const response = await this.callOpenAiApi(prompt);
    try {
      const parsed = JSON.parse(response);
      const validated = ComparisonAiSchema.parse(parsed);
      return {
        executiveSummary: validated.executiveSummary,
        addedClauses: validated.addedClauses,
        removedClauses: validated.removedClauses,
        modifiedClauses: validated.modifiedClauses,
        changedObligations: validated.changedObligations,
        changedFinancialTerms: validated.changedFinancialTerms,
        changedDates: validated.changedDates,
        changedTermination: validated.changedTermination,
        changedLiability: validated.changedLiability,
        changedDisputeResolution: validated.changedDisputeResolution,
      };
    } catch {
      throw new AIServiceUnavailableError('Failed to generate valid comparison from AI service.');
    }
  }

  public async answerGroundedQuestion(
    question: string,
    contextChunks: DocumentChunk[]
  ): Promise<StructuredAnswer> {
    if (!this.apiKey) {
      throw new AIServiceUnavailableError('OpenAI API key is not configured.');
    }
    this.promptSecurity.validateUserPrompt(question);
    const contextText = contextChunks.map((c) => `[Chunk: ${c.id}] ${c.content}`).join('\n---\n');
    const prompt = `Question: "${question}"\nContext:\n${contextText}\nReturn JSON with shortAnswer, whatTheDocumentSays, whyItMatters, sourceCitations, questionsForLawyer, grounded.`;
    const response = await this.callOpenAiApi(prompt);
    try {
      const parsed = JSON.parse(response);
      const validated = GroundedAnswerAiSchema.parse(parsed);
      return {
        ...validated,
        aiProvider: 'OpenAI',
      };
    } catch {
      throw new AIServiceUnavailableError('Failed to generate valid answer from AI service.');
    }
  }

  public async generateBriefing(
    documentTitle: string,
    analysis: any
  ): Promise<Omit<LegalBriefingProps, 'id' | 'userId' | 'documentId' | 'documentTitle' | 'createdAt' | 'updatedAt'>> {
    if (!this.apiKey) {
      throw new AIServiceUnavailableError('OpenAI API key is not configured.');
    }
    const prompt = `Generate lawyer briefing for "${documentTitle}" based on summary: ${analysis.highLevelSummary}. Return JSON matching schema.`;
    const response = await this.callOpenAiApi(prompt);
    try {
      const parsed = JSON.parse(response);
      const validated = LawyerBriefingAiSchema.parse(parsed);
      return {
        conciseSummary: validated.conciseSummary,
        lawyerChecklist: {
          questionsToAsk: validated.lawyerChecklist.questionsToAsk,
          documentsToBring: validated.lawyerChecklist.documentsToBring,
          importantDeadlines: validated.lawyerChecklist.importantDeadlines,
          keyConcerns: validated.lawyerChecklist.keyConcerns,
          clarificationAreas: validated.lawyerChecklist.clarificationAreas,
        },
        actionChecklist: validated.actionChecklist.map((a) => ({
          id: a.id,
          label: a.label,
          category: a.category,
          completed: Boolean(a.completed),
        })),
      };
    } catch {
      throw new AIServiceUnavailableError('Failed to generate valid briefing from AI service.');
    }
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
      if (res.status === 429) {
        throw new RateLimitError('OpenAI rate limit exceeded.');
      }
      throw new AIServiceUnavailableError(`OpenAI API error: ${res.status}`);
    }

    const data = (await res.json()) as any;
    return data?.choices?.[0]?.message?.content || '{}';
  }
}
