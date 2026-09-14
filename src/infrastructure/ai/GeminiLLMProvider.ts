import { DocumentAnalysisProps } from '../../core/domain/DocumentAnalysis';
import { ComparisonProps } from '../../core/domain/Comparison';
import { StructuredAnswer } from '../../core/domain/ChatMessage';
import { LegalBriefingProps } from '../../core/domain/LegalBriefing';
import { DocumentChunk } from '../../core/domain/DocumentChunk';
import { ILLMProvider } from '../../core/ports';
import { MockLLMProvider } from './MockLLMProvider';
import { PromptSecurityService } from './PromptSecurityService';

export class GeminiLLMProvider implements ILLMProvider {
  public readonly name: string = 'GeminiLLMProvider';
  private apiKey: string;
  private model: string;
  private fallback: MockLLMProvider;
  private promptSecurity: PromptSecurityService;

  constructor(apiKey: string = '', model: string = 'gemini-1.5-flash') {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
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
      const wrappedContext = this.promptSecurity.wrapUntrustedContext(documentText.substring(0, 15000));
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

      const response = await this.callGeminiApi(prompt);
      const cleanedJson = this.extractJson(response);
      return JSON.parse(cleanedJson);
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
      const prompt = `
${this.promptSecurity.getSystemGuardrails()}

TASK: Compare these two legal documents in plain language:
Document A: "${docA.title}"
${this.promptSecurity.wrapUntrustedContext(docA.text.substring(0, 8000))}

Document B: "${docB.title}"
${this.promptSecurity.wrapUntrustedContext(docB.text.substring(0, 8000))}

Return a valid JSON object matching this schema:
{
  "executiveSummary": string,
  "addedClauses": [{"category": string, "documentA": string, "documentB": string, "difference": string, "whyItMatters": string, "impactLevel": "low"|"moderate"|"significant"}],
  "removedClauses": [{"category": string, "documentA": string, "documentB": string, "difference": string, "whyItMatters": string, "impactLevel": "low"|"moderate"|"significant"}],
  "modifiedClauses": [{"category": string, "documentA": string, "documentB": string, "difference": string, "whyItMatters": string, "impactLevel": "low"|"moderate"|"significant"}],
  "changedObligations": [...],
  "changedFinancialTerms": [...],
  "changedDates": [...],
  "changedTermination": [...],
  "changedLiability": [...],
  "changedDisputeResolution": [...]
}
`;
      const response = await this.callGeminiApi(prompt);
      const cleaned = this.extractJson(response);
      return JSON.parse(cleaned);
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
      const contextText = contextChunks
        .map((c) => `[Page ${c.pageNumber}, Section: ${c.sectionHeading} (ID: ${c.id})]:\n${c.content}`)
        .join('\n\n');

      const prompt = `
${this.promptSecurity.getSystemGuardrails()}

USER QUESTION: "${this.promptSecurity.sanitizeInput(question)}"

RELEVANT DOCUMENT CONTEXT:
${this.promptSecurity.wrapUntrustedContext(contextText)}

Return a valid JSON object:
{
  "shortAnswer": string,
  "whatTheDocumentSays": string,
  "whyItMatters": string,
  "sourceCitations": [{"chunkId": string, "pageNumber": number, "sectionHeading": string, "textSnippet": string}],
  "questionsForLawyer": string[],
  "grounded": boolean
}
If the answer cannot be established from the document context, set:
"shortAnswer": "I couldn't find enough information in the document to answer that confidently.",
"grounded": false
`;
      const response = await this.callGeminiApi(prompt);
      const cleaned = this.extractJson(response);
      return JSON.parse(cleaned);
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

  private async callGeminiApi(prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as any;
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  private extractJson(text: string): string {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) return match[1].trim();
    return text.trim();
  }
}
