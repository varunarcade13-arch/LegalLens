export interface SanitizedUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export type UserDTO = SanitizedUser;

export interface LegalDocumentDTO {
  id: string;
  userId: string;
  title: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  pageCount: number;
  characterCount: number;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImportantClauseDTO {
  id: string;
  documentId: string;
  category: string;
  title: string;
  originalText: string;
  plainExplanation: string;
  whyItMatters: string;
  concernLevel: 'informational' | 'review_carefully' | 'high_attention';
  pageNumber: number;
  sectionHeading: string;
}

export interface AttentionFindingDTO {
  id: string;
  documentId: string;
  category: 'informational' | 'review_carefully' | 'high_attention';
  finding: string;
  whyItMatters: string;
  sourceReference: string;
  pageNumber: number;
  sectionHeading: string;
  questionsToConsider: string[];
  suggestedProfessionalFollowUp: string;
}

export interface ExtractedFactDTO {
  category: string;
  fact: string;
  verbatimExcerpt: string;
  pageNumber: number;
}

export interface PlainLanguageSummaryDTO {
  whatThisDocumentIsAbout: string;
  whatYouAreAgreeingTo: string[];
  whatTheOtherPartyIsAgreeingTo: string[];
  yourKeyResponsibilities: string[];
  yourRights: string[];
  importantDates: string[];
  financialObligations: string[];
  terminationConditions: string[];
}

export interface DocumentAnalysisDTO {
  id: string;
  documentId: string;
  documentType: string;
  partiesInvolved: string[];
  effectiveDate: string | null;
  expirationDate: string | null;
  jurisdiction: string | null;
  highLevelSummary: string;
  plainLanguageSummary: PlainLanguageSummaryDTO;
  extractedFacts: ExtractedFactDTO[];
  clauses: ImportantClauseDTO[];
  findings: AttentionFindingDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface ClauseDifferenceDTO {
  category: string;
  documentA: string;
  documentB: string;
  difference: string;
  whyItMatters: string;
  impactLevel: 'low' | 'moderate' | 'significant';
}

export interface ComparisonDTO {
  id: string;
  userId: string;
  documentAId: string;
  documentBId: string;
  documentATitle: string;
  documentBTitle: string;
  executiveSummary: string;
  addedClauses: ClauseDifferenceDTO[];
  removedClauses: ClauseDifferenceDTO[];
  modifiedClauses: ClauseDifferenceDTO[];
  changedObligations: ClauseDifferenceDTO[];
  changedFinancialTerms: ClauseDifferenceDTO[];
  changedDates: ClauseDifferenceDTO[];
  changedTermination: ClauseDifferenceDTO[];
  changedLiability: ClauseDifferenceDTO[];
  changedDisputeResolution: ClauseDifferenceDTO[];
  createdAt: string;
}

export interface CitationDTO {
  chunkId: string;
  pageNumber: number;
  sectionHeading: string;
  textSnippet: string;
}

export interface StructuredAnswerDTO {
  shortAnswer: string;
  whatTheDocumentSays: string;
  whyItMatters: string;
  sourceCitations: CitationDTO[];
  questionsForLawyer: string[];
  grounded: boolean;
  groundingConfidence?: number;
  aiProvider?: string;
}

export interface ChatMessageDTO {
  id: string;
  userId: string;
  documentId: string;
  role: 'user' | 'assistant';
  content: string;
  structuredAnswer?: StructuredAnswerDTO | null;
  createdAt: string;
}

export interface ActionChecklistItemDTO {
  id: string;
  label: string;
  category: string;
  completed: boolean;
}

export interface LawyerChecklistDTO {
  questionsToAsk: string[];
  documentsToBring: string[];
  importantDeadlines: string[];
  keyConcerns: string[];
  clarificationAreas: string[];
}

export interface LegalBriefingDTO {
  id: string;
  userId: string;
  documentId: string;
  documentTitle: string;
  conciseSummary: string;
  lawyerChecklist: LawyerChecklistDTO;
  actionChecklist: ActionChecklistItemDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStatsDTO {
  totalDocuments: number;
  totalAnalyses: number;
  totalPendingActionItems: number;
  recentDocuments: LegalDocumentDTO[];
}

export interface DemoTemplateDTO {
  id: string;
  title: string;
  category: string;
  description: string;
  filename: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      this.token = window.sessionStorage.getItem('legallens_token');
    }
  }

  public setToken(token: string | null): void {
    this.token = token;
    if (typeof window !== 'undefined' && window.sessionStorage) {
      if (token) {
        window.sessionStorage.setItem('legallens_token', token);
      } else {
        window.sessionStorage.removeItem('legallens_token');
      }
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMsg = `Request failed (${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson?.error?.message) {
          errorMsg = errJson.error.message;
        }
      } catch {
        // use fallback errorMsg
      }
      throw new Error(errorMsg);
    }

    if (response.headers.get('Content-Type')?.includes('text/markdown')) {
      return (await response.text()) as unknown as T;
    }

    return (await response.json()) as T;
  }

  // Auth
  public async register(dto: { email: string; password: string; name: string }) {
    const res = await this.request<{ user: SanitizedUser; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    this.setToken(res.token);
    return res;
  }

  public async login(dto: { email: string; password: string }) {
    const res = await this.request<{ user: SanitizedUser; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    this.setToken(res.token);
    return res;
  }

  public async getProfile() {
    return this.request<{ user: SanitizedUser }>('/api/auth/profile');
  }

  public async deleteAccount() {
    const res = await this.request<{ success: boolean; message: string }>('/api/auth/account', {
      method: 'DELETE',
    });
    this.setToken(null);
    return res;
  }

  public logout() {
    this.setToken(null);
  }

  // Documents
  public async uploadDocument(formData: FormData) {
    return this.request<{ document: LegalDocumentDTO }>('/api/documents', {
      method: 'POST',
      body: formData,
    });
  }

  public async listDocuments() {
    return this.request<{ documents: LegalDocumentDTO[] }>('/api/documents');
  }

  public async getDocument(id: string) {
    return this.request<{ document: LegalDocumentDTO }>(`/api/documents/${id}`);
  }

  public async deleteDocument(id: string) {
    return this.request<{ success: boolean; message: string }>(`/api/documents/${id}`, {
      method: 'DELETE',
    });
  }

  public async searchDocument(id: string, query: string) {
    return this.request<{
      results: { chunkId: string; pageNumber: number; sectionHeading: string; matchedSnippet: string }[];
    }>(`/api/documents/${id}/search?q=${encodeURIComponent(query)}`);
  }

  // Analysis
  public async analyzeDocument(id: string, force: boolean = false) {
    return this.request<{ analysis: DocumentAnalysisDTO }>(
      `/api/documents/${id}/analyze?force=${force}`,
      { method: 'POST' }
    );
  }

  public async getAnalysis(id: string) {
    return this.request<{ analysis: DocumentAnalysisDTO }>(`/api/documents/${id}/analysis`);
  }

  // Chat
  public async askChat(id: string, question: string) {
    return this.request<{ message: ChatMessageDTO }>(`/api/documents/${id}/chat`, {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  }

  public async getChatHistory(id: string) {
    return this.request<{ messages: ChatMessageDTO[] }>(`/api/documents/${id}/chat`);
  }

  public async clearChatHistory(id: string) {
    return this.request<{ success: boolean; message: string }>(`/api/documents/${id}/chat`, {
      method: 'DELETE',
    });
  }

  // Comparison
  public async compareDocuments(documentAId: string, documentBId: string) {
    return this.request<{ comparison: ComparisonDTO }>('/api/comparisons', {
      method: 'POST',
      body: JSON.stringify({ documentAId, documentBId }),
    });
  }

  public async getComparison(id: string) {
    return this.request<{ comparison: ComparisonDTO }>(`/api/comparisons/${id}`);
  }

  public async listComparisons() {
    return this.request<{ comparisons: ComparisonDTO[] }>('/api/comparisons');
  }

  // Briefing
  public async getBriefing(id: string) {
    return this.request<{ briefing: LegalBriefingDTO }>(`/api/documents/${id}/briefing`);
  }

  public async toggleChecklist(id: string, itemId: string, completed?: boolean) {
    return this.request<{ briefing: LegalBriefingDTO }>(`/api/documents/${id}/briefing/checklist`, {
      method: 'PATCH',
      body: JSON.stringify({ itemId, completed }),
    });
  }

  public async exportBriefingMarkdown(id: string): Promise<string> {
    return this.request<string>(`/api/documents/${id}/briefing/export`);
  }

  // Demo & Dashboard
  public async getDemoTemplates() {
    return this.request<{ templates: DemoTemplateDTO[] }>('/api/demo/templates');
  }

  public async loadDemoTemplate(templateId: string) {
    return this.request<{ message: string; document: LegalDocumentDTO }>('/api/demo/load', {
      method: 'POST',
      body: JSON.stringify({ templateId }),
    });
  }

  public async getDashboardStats() {
    return this.request<DashboardStatsDTO>('/api/demo/stats');
  }
}

export const api = new ApiClient();
