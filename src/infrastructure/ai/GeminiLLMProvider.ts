import { DocumentAnalysisProps } from '../../core/domain/DocumentAnalysis';
import { ComparisonProps } from '../../core/domain/Comparison';
import { StructuredAnswer, Citation } from '../../core/domain/ChatMessage';
import { LegalBriefingProps } from '../../core/domain/LegalBriefing';
import { DocumentChunk } from '../../core/domain/DocumentChunk';
import {
  ILLMProvider,
  DocumentAnalysisAiSchema,
  ComparisonAiSchema,
  GroundedAnswerAiSchema,
  LawyerBriefingAiSchema,
} from '../../core/ports';
import {
  AIServiceUnavailableError,
  AIServiceError,
  RateLimitError,
} from '../../core/domain/Errors';
import { PromptSecurityService } from './PromptSecurityService';
import { z } from 'zod';

export class GeminiLLMProvider implements ILLMProvider {
  public readonly name: string = 'GeminiLLMProvider';
  private apiKey: string;
  private model: string;
  private timeoutMs: number;
  private maxRetries: number;
  private promptSecurity: PromptSecurityService;

  constructor(
    apiKey: string = '',
    model: string = '',
    timeoutMs?: number,
    maxRetries: number = 1
  ) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    this.model = model || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    this.timeoutMs = timeoutMs ?? (process.env.AI_REQUEST_TIMEOUT_MS ? Number(process.env.AI_REQUEST_TIMEOUT_MS) : 30000);
    this.maxRetries = maxRetries;
    this.promptSecurity = new PromptSecurityService();
  }

  public async generateAnalysis(
    documentTitle: string,
    documentText: string,
    _chunks: DocumentChunk[]
  ): Promise<Omit<DocumentAnalysisProps, 'id' | 'documentId' | 'createdAt' | 'updatedAt'>> {
    if (!this.apiKey) {
      throw new AIServiceUnavailableError('Gemini API key is not configured.');
    }

    const wrappedContext = this.promptSecurity.wrapUntrustedContext(documentText.substring(0, 20000));
    const prompt = `
${this.promptSecurity.getSystemGuardrails()}

TASK: Analyze the following legal document titled "${documentTitle}".
Return your analysis as a valid JSON object matching this schema:
{
  "documentType": string,
  "partiesInvolved": string[],
  "effectiveDate": string | null,
  "expirationDate": string | null,
  "jurisdiction": string | null,
  "highLevelSummary": string,
  "plainLanguageSummary": {
    "whatThisDocumentIsAbout": string,
    "whatYouAreAgreeingTo": string[],
    "whatTheOtherPartyIsAgreeingTo": string[],
    "yourKeyResponsibilities": string[],
    "yourRights": string[],
    "importantDates": string[],
    "financialObligations": string[],
    "terminationConditions": string[]
  },
  "extractedFacts": [{"category": string, "fact": string, "verbatimExcerpt": string, "pageNumber": number}],
  "clauses": [{"category": string, "title": string, "originalText": string, "plainExplanation": string, "whyItMatters": string, "concernLevel": "informational"|"review_carefully"|"high_attention", "pageNumber": number, "sectionHeading": string}],
  "findings": [{"category": "informational"|"review_carefully"|"high_attention", "finding": string, "whyItMatters": string, "sourceReference": string, "pageNumber": number, "sectionHeading": string, "questionsToConsider": string[], "suggestedProfessionalFollowUp": string}]
}

DOCUMENT CONTENT:
${wrappedContext}
`;

    const rawResponse = await this.callGeminiApi(prompt);
    const validated = await this.parseAndValidate(rawResponse, DocumentAnalysisAiSchema, () => this.callGeminiApi(prompt));
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
      throw new AIServiceUnavailableError('Gemini API key is not configured.');
    }

    const wrappedA = this.promptSecurity.wrapUntrustedContext(docA.text.substring(0, 10000));
    const wrappedB = this.promptSecurity.wrapUntrustedContext(docB.text.substring(0, 10000));

    const prompt = `
${this.promptSecurity.getSystemGuardrails()}

TASK: Compare these two legal documents in plain language:
Document A: "${docA.title}"
${wrappedA}

Document B: "${docB.title}"
${wrappedB}

Return a valid JSON object matching this schema:
{
  "executiveSummary": string,
  "addedClauses": [{"category": string, "documentA": string, "documentB": string, "difference": string, "whyItMatters": string, "impactLevel": "low"|"moderate"|"significant"}],
  "removedClauses": [{"category": string, "documentA": string, "documentB": string, "difference": string, "whyItMatters": string, "impactLevel": "low"|"moderate"|"significant"}],
  "modifiedClauses": [{"category": string, "documentA": string, "documentB": string, "difference": string, "whyItMatters": string, "impactLevel": "low"|"moderate"|"significant"}],
  "changedObligations": [{"category": string, "documentA": string, "documentB": string, "difference": string, "whyItMatters": string, "impactLevel": "low"|"moderate"|"significant"}],
  "changedFinancialTerms": [{"category": string, "documentA": string, "documentB": string, "difference": string, "whyItMatters": string, "impactLevel": "low"|"moderate"|"significant"}],
  "changedDates": [{"category": string, "documentA": string, "documentB": string, "difference": string, "whyItMatters": string, "impactLevel": "low"|"moderate"|"significant"}],
  "changedTermination": [{"category": string, "documentA": string, "documentB": string, "difference": string, "whyItMatters": string, "impactLevel": "low"|"moderate"|"significant"}],
  "changedLiability": [{"category": string, "documentA": string, "documentB": string, "difference": string, "whyItMatters": string, "impactLevel": "low"|"moderate"|"significant"}],
  "changedDisputeResolution": [{"category": string, "documentA": string, "documentB": string, "difference": string, "whyItMatters": string, "impactLevel": "low"|"moderate"|"significant"}]
}
`;

    const rawResponse = await this.callGeminiApi(prompt);
    const validated = await this.parseAndValidate(rawResponse, ComparisonAiSchema, () => this.callGeminiApi(prompt));
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
  }

  public async answerGroundedQuestion(
    question: string,
    contextChunks: DocumentChunk[]
  ): Promise<StructuredAnswer> {
    if (!this.apiKey) {
      throw new AIServiceUnavailableError('Gemini API key is not configured.');
    }

    this.promptSecurity.validateUserPrompt(question);

    if (!contextChunks || contextChunks.length === 0) {
      return {
        shortAnswer: "I couldn't find enough information in the document to answer that confidently.",
        whatTheDocumentSays: 'The uploaded document does not contain relevant clauses addressing this inquiry.',
        whyItMatters: 'Important rights and responsibilities should be explicitly defined in the agreement.',
        sourceCitations: [],
        questionsForLawyer: [
          'Is this matter addressed by background statutory law in our jurisdiction?',
          'Should we request a written amendment clarifying this term?',
        ],
        grounded: false,
        groundingConfidence: 0.0,
        aiProvider: 'Gemini',
      };
    }

    const contextText = contextChunks
      .map((c) => `[Chunk ID: ${c.id}]\n[Page: ${c.pageNumber}]\n[Section: ${c.sectionHeading}]\n${c.content}`)
      .join('\n\n---\n\n');

    const prompt = `
${this.promptSecurity.getSystemGuardrails()}

USER QUESTION: "${this.promptSecurity.sanitizeInput(question)}"

RELEVANT DOCUMENT CONTEXT:
${this.promptSecurity.wrapLegalDocumentContext(contextText)}

Return a valid JSON object matching this schema:
{
  "shortAnswer": string,
  "whatTheDocumentSays": string,
  "whyItMatters": string,
  "sourceCitations": [{"chunkId": string, "pageNumber": number, "sectionHeading": string, "textSnippet": string}],
  "questionsForLawyer": string[],
  "grounded": boolean
}
If the question cannot be answered from the document context, set:
"shortAnswer": "I couldn't find enough information in the document to answer that confidently.",
"grounded": false
`;

    const rawResponse = await this.callGeminiApi(prompt);
    const parsed = await this.parseAndValidate(
      rawResponse,
      GroundedAnswerAiSchema,
      () => this.callGeminiApi(prompt)
    );

    // Validate citations against actual retrieved chunks
    const validatedCitations: Citation[] = [];
    for (const citation of parsed.sourceCitations) {
      const matchingChunk = contextChunks.find((c) => c.id === citation.chunkId);
      if (matchingChunk) {
        const snippetValid =
          !citation.textSnippet ||
          matchingChunk.content.toLowerCase().includes(citation.textSnippet.toLowerCase().substring(0, 30)) ||
          citation.textSnippet.trim().length === 0;

        if (snippetValid) {
          validatedCitations.push({
            chunkId: matchingChunk.id,
            pageNumber: matchingChunk.pageNumber,
            sectionHeading: matchingChunk.sectionHeading,
            textSnippet: citation.textSnippet || matchingChunk.content.substring(0, 160),
          });
        }
      }
    }

    const rawCitationCount = parsed.sourceCitations.length;
    let confidence = 0.0;
    if (parsed.grounded && validatedCitations.length > 0) {
      confidence = Math.min(1.0, validatedCitations.length / Math.max(1, rawCitationCount));
    }

    const isGrounded = Boolean(parsed.grounded && validatedCitations.length > 0);

    return {
      shortAnswer: parsed.shortAnswer,
      whatTheDocumentSays: parsed.whatTheDocumentSays,
      whyItMatters: parsed.whyItMatters,
      sourceCitations: validatedCitations,
      questionsForLawyer: parsed.questionsForLawyer,
      grounded: isGrounded,
      groundingConfidence: Number(confidence.toFixed(2)),
      aiProvider: 'Gemini',
    };
  }

  public async generateBriefing(
    documentTitle: string,
    analysis: any
  ): Promise<Omit<LegalBriefingProps, 'id' | 'userId' | 'documentId' | 'documentTitle' | 'createdAt' | 'updatedAt'>> {
    if (!this.apiKey) {
      throw new AIServiceUnavailableError('Gemini API key is not configured.');
    }

    const prompt = `
${this.promptSecurity.getSystemGuardrails()}

TASK: Generate an actionable lawyer consultation briefing for the document titled "${documentTitle}".
Use the following document analysis to construct the brief:
Summary: ${analysis.highLevelSummary || 'Standard agreement'}
Document Type: ${analysis.documentType || 'Commercial contract'}
Jurisdiction: ${analysis.jurisdiction || 'Applicable state law'}
Effective Date: ${analysis.effectiveDate || 'Not specified'}
Expiration Date: ${analysis.expirationDate || 'Not specified'}

Return a valid JSON object matching this schema:
{
  "conciseSummary": string,
  "lawyerChecklist": {
    "questionsToAsk": string[],
    "documentsToBring": string[],
    "importantDeadlines": string[],
    "keyConcerns": string[],
    "clarificationAreas": string[]
  },
  "actionChecklist": [
    {"id": string, "label": string, "category": string, "completed": boolean}
  ]
}
Ensure conciseSummary explicitly clarifies that this brief is an AI-generated preparation aid, not legal advice.
`;

    const rawResponse = await this.callGeminiApi(prompt);
    const validated = await this.parseAndValidate(rawResponse, LawyerBriefingAiSchema, () => this.callGeminiApi(prompt));
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
  }

  private async callGeminiApi(prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
        signal: controller.signal,
      });
    } catch {
      clearTimeout(timeoutId);
      throw new AIServiceUnavailableError('AI service is temporarily unavailable. Please try again.');
    }
    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 429) {
        throw new RateLimitError('AI service rate limit exceeded. Please try again later.');
      }
      if (res.status === 401 || res.status === 403) {
        throw new AIServiceUnavailableError('AI service authentication failed.');
      }
      if (res.status === 404) {
        throw new AIServiceUnavailableError('Configured Gemini model was not found.');
      }
      if (res.status >= 500) {
        throw new AIServiceUnavailableError('Gemini service is temporarily unavailable. Please try again.');
      }
      throw new AIServiceError(`Gemini API returned HTTP ${res.status}`);
    }

    const data = (await res.json()) as any;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || text.trim().length === 0) {
      throw new AIServiceUnavailableError('Empty response from Gemini API.');
    }

    return text;
  }

  private async parseAndValidate<T>(
    rawText: string,
    schema: z.ZodType<T, any, any>,
    retryCall?: () => Promise<string>
  ): Promise<T> {
    let cleaned = this.extractJson(rawText);
    try {
      const parsed = JSON.parse(cleaned);
      return schema.parse(parsed);
    } catch {
      if (retryCall && this.maxRetries > 0) {
        try {
          const retriedRaw = await retryCall();
          cleaned = this.extractJson(retriedRaw);
          const parsedAgain = JSON.parse(cleaned);
          return schema.parse(parsedAgain);
        } catch {
          throw new AIServiceUnavailableError('Failed to generate valid legal analysis from AI service.');
        }
      }
      throw new AIServiceUnavailableError('Failed to generate valid legal analysis from AI service.');
    }
  }

  private extractJson(text: string): string {
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) return codeBlockMatch[1].trim();

    // Find outer curly braces
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return text.substring(firstBrace, lastBrace + 1).trim();
    }

    return text.trim();
  }
}
