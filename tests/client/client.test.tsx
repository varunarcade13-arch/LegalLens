import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Client Components & API
import { LegalDisclaimerBanner } from '../../src/client/components/LegalDisclaimerBanner';
import { Header } from '../../src/client/components/Header';
import { LandingPage } from '../../src/client/components/LandingPage';
import { AuthModal } from '../../src/client/components/AuthModal';
import { UploadZone } from '../../src/client/components/UploadZone';
import { DashboardView } from '../../src/client/components/DashboardView';
import { AnalysisView } from '../../src/client/components/AnalysisView';
import { DocumentSearch } from '../../src/client/components/DocumentSearch';
import { DocumentComparison } from '../../src/client/components/DocumentComparison';
import { ChatInterface } from '../../src/client/components/ChatInterface';
import { ActionableBriefingView } from '../../src/client/components/ActionableBriefingView';
import { UserProfileView } from '../../src/client/components/UserProfileView';
import {
  api,
  LegalDocumentDTO,
  DocumentAnalysisDTO,
  LegalBriefingDTO,
  ComparisonDTO,
  SanitizedUser,
} from '../../src/client/services/api';

describe('Client Components & UI Testing', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('LegalDisclaimerBanner', () => {
    it('renders prominent legal disclaimer text and WCAG complementary role', () => {
      render(<LegalDisclaimerBanner />);
      const banner = screen.getByRole('complementary', { name: /legal information disclaimer/i });
      expect(banner).toBeDefined();
      expect(banner.textContent).toContain('Legal Information Notice');
      expect(banner.textContent).toContain('not a substitute for a qualified lawyer');
    });

    it('allows collapsing and expanding the disclaimer details', () => {
      render(<LegalDisclaimerBanner />);
      const toggleBtn = screen.getByRole('button', { name: /learn more/i });
      expect(toggleBtn).toBeDefined();

      fireEvent.click(toggleBtn);
      expect(screen.getByText(/Generative AI outputs are probabilistic summaries/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /hide details/i })).toBeDefined();

      fireEvent.click(screen.getByRole('button', { name: /hide details/i }));
      expect(screen.queryByText(/Generative AI outputs are probabilistic summaries/i)).toBeNull();
    });
  });

  describe('Header', () => {
    it('renders branding, theme switcher, and sign-in button when logged out', () => {
      const onOpenAuth = vi.fn();
      const onToggleTheme = vi.fn();

      render(
        <Header
          user={null}
          activeTab="dashboard"
          onSelectTab={vi.fn()}
          onOpenAuth={onOpenAuth}
          onLogout={vi.fn()}
          theme="light"
          onToggleTheme={onToggleTheme}
        />
      );

      expect(screen.getByLabelText('LegalLens Home')).toBeDefined();
      const signInBtn = screen.getByRole('button', { name: /sign in \/ register/i });
      fireEvent.click(signInBtn);
      expect(onOpenAuth).toHaveBeenCalled();

      const themeBtn = screen.getByRole('button', { name: /switch to dark theme/i });
      fireEvent.click(themeBtn);
      expect(onToggleTheme).toHaveBeenCalled();
    });

    it('renders navigation links and user profile trigger when logged in', () => {
      const onSelectTab = vi.fn();
      const onLogout = vi.fn();

      const mockUser: SanitizedUser = {
        id: 'u1',
        email: 'counsel@test.com',
        name: 'Counsel Jane',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      };

      render(
        <Header
          user={mockUser}
          activeTab="dashboard"
          onSelectTab={onSelectTab}
          onOpenAuth={vi.fn()}
          onLogout={onLogout}
          theme="dark"
          onToggleTheme={vi.fn()}
        />
      );

      expect(screen.getByText('Counsel')).toBeDefined();

      const compareBtn = screen.getByRole('button', { name: /compare/i });
      fireEvent.click(compareBtn);
      expect(onSelectTab).toHaveBeenCalledWith('compare');

      const logoutBtn = screen.getByRole('button', { name: /log out/i });
      fireEvent.click(logoutBtn);
      expect(onLogout).toHaveBeenCalled();
    });
  });

  describe('LandingPage', () => {
    it('renders hero title, feature highlights, and call to action buttons', () => {
      const onGetStarted = vi.fn();
      const onTryDemo = vi.fn();

      render(<LandingPage onGetStarted={onGetStarted} onTryDemo={onTryDemo} />);

      expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
      expect(screen.getByText(/understand legal documents/i)).toBeDefined();

      const getStartedBtn = screen.getByRole('button', { name: /get started free/i });
      fireEvent.click(getStartedBtn);
      expect(onGetStarted).toHaveBeenCalled();

      const demoBtn = screen.getByRole('button', { name: /explore fictional demo/i });
      fireEvent.click(demoBtn);
      expect(onTryDemo).toHaveBeenCalled();
    });
  });

  describe('AuthModal', () => {
    it('switches between Sign In and Create Account and submits successfully', async () => {
      const onClose = vi.fn();
      const onSuccess = vi.fn();

      vi.spyOn(api, 'login').mockResolvedValueOnce({
        user: { id: 'u1', email: 'test@example.com', name: 'Test User', createdAt: '', updatedAt: '' },
        token: 'test-jwt',
      });

      render(<AuthModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByRole('heading', { name: /sign in to legallens/i })).toBeDefined();

      // Switch to register tab
      const createTab = screen.getByRole('tab', { name: /register/i });
      fireEvent.click(createTab);
      expect(screen.getByRole('heading', { name: /create your account/i })).toBeDefined();

      // Switch back to sign in
      const signInTab = screen.getByRole('tab', { name: /sign in/i });
      fireEvent.click(signInTab);

      // Enter email and password
      const emailInput = screen.getByPlaceholderText(/name@example.com/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      const passInput = screen.getByPlaceholderText(/••••••••/i);
      fireEvent.change(passInput, { target: { value: 'Password123!' } });

      const submitBtn = screen.getByRole('button', { name: /^sign in$/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(api.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'Password123!',
        });
        expect(onSuccess).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('closes on Escape key press or close button click', () => {
      const onClose = vi.fn();
      render(<AuthModal isOpen={true} onClose={onClose} onSuccess={vi.fn()} />);

      const closeBtn = screen.getByRole('button', { name: /close dialog/i });
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalled();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(2);
    });
  });

  describe('UploadZone', () => {
    it('rejects unsupported file extensions with an alert', async () => {
      render(<UploadZone onDocumentUploaded={vi.fn()} />);

      const file = new File(['binary code'], 'malicious.exe', { type: 'application/octet-stream' });
      const dropzone = screen.getByRole('button', { name: /upload legal document/i });
      const input = dropzone.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeDefined();
        expect(screen.getByText(/unsupported file type/i)).toBeDefined();
      });
    });

    it('uploads valid document and triggers onDocumentUploaded', async () => {
      const onDocumentUploaded = vi.fn();

      const mockDoc: LegalDocumentDTO = {
        id: 'doc1',
        userId: 'u1',
        title: 'Master Agreement',
        originalFilename: 'agreement.txt',
        mimeType: 'text/plain',
        fileSizeBytes: 1024,
        pageCount: 1,
        characterCount: 500,
        status: 'ready',
        errorMessage: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.spyOn(api, 'uploadDocument').mockResolvedValueOnce({
        document: mockDoc,
      });
      vi.spyOn(api, 'analyzeDocument').mockResolvedValueOnce({
        analysis: {} as any,
      });

      render(<UploadZone onDocumentUploaded={onDocumentUploaded} />);

      const validFile = new File(['valid legal contract content'], 'agreement.txt', { type: 'text/plain' });
      const dropzone = screen.getByRole('button', { name: /upload legal document/i });
      const input = dropzone.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(input, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(api.uploadDocument).toHaveBeenCalled();
        expect(api.analyzeDocument).toHaveBeenCalledWith('doc1');
        expect(onDocumentUploaded).toHaveBeenCalledWith(mockDoc);
      });
    });
  });

  describe('DashboardView', () => {
    const mockUser: SanitizedUser = {
      id: 'u1',
      email: 'user@legallens.test',
      name: 'Sarah Counsel',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };

    const mockStats = {
      totalDocuments: 3,
      totalAnalyses: 2,
      totalPendingActionItems: 4,
      recentDocuments: [],
    };

    const mockDocs: LegalDocumentDTO[] = [
      {
        id: 'doc-1',
        userId: 'u1',
        title: 'Employment Agreement',
        originalFilename: 'employment.txt',
        mimeType: 'text/plain',
        fileSizeBytes: 2048,
        pageCount: 2,
        characterCount: 1500,
        status: 'ready',
        errorMessage: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    it('displays user greeting, stats metrics, and document table', () => {
      const onOpenAnalyze = vi.fn();
      const onOpenUpload = vi.fn();

      render(
        <DashboardView
          user={mockUser}
          stats={mockStats}
          documents={mockDocs}
          onOpenUpload={onOpenUpload}
          onOpenCompare={vi.fn()}
          onOpenChat={vi.fn()}
          onOpenAnalyze={onOpenAnalyze}
          onOpenBriefing={vi.fn()}
          onOpenSearch={vi.fn()}
          onDeleteDoc={vi.fn()}
          onLoadDemo={vi.fn()}
        />
      );

      expect(screen.getByText(/welcome back, sarah counsel/i)).toBeDefined();
      expect(screen.getByText('Employment Agreement')).toBeDefined();

      const analyzeBtn = screen.getByRole('button', { name: /^analyze$/i });
      fireEvent.click(analyzeBtn);
      expect(onOpenAnalyze).toHaveBeenCalledWith('doc-1');
    });
  });

  describe('AnalysisView', () => {
    const mockDoc: LegalDocumentDTO = {
      id: 'd1',
      userId: 'u1',
      title: 'Executive Agreement',
      originalFilename: 'agreement.txt',
      mimeType: 'text/plain',
      fileSizeBytes: 1024,
      pageCount: 2,
      characterCount: 800,
      status: 'ready',
      errorMessage: null,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };

    const mockAnalysis: DocumentAnalysisDTO = {
      id: 'a1',
      documentId: 'd1',
      documentType: 'Employment',
      partiesInvolved: ['Employer Inc.', 'Employee'],
      effectiveDate: '2025-01-15',
      expirationDate: null,
      jurisdiction: 'Delaware',
      highLevelSummary: 'Executive employment terms and restrictive covenants.',
      plainLanguageSummary: {
        whatThisDocumentIsAbout: 'Outlines job responsibilities, compensation, and exit rules.',
        whatYouAreAgreeingTo: ['Devote full time to duties'],
        whatTheOtherPartyIsAgreeingTo: ['Pay base salary of $185,000'],
        yourKeyResponsibilities: ['Confidentiality'],
        yourRights: ['30 days notice before termination'],
        importantDates: ['Effective January 15, 2025'],
        financialObligations: ['Semi-monthly payroll'],
        terminationConditions: ['30 days written notice'],
      },
      extractedFacts: [
        {
          category: 'Financial',
          fact: 'Base salary is $185,000',
          verbatimExcerpt: 'Employer shall pay Employee base annual salary of $185,000',
          pageNumber: 1,
        },
      ],
      clauses: [
        {
          id: 'c1',
          documentId: 'd1',
          category: 'Termination',
          title: 'Termination for Convenience',
          originalText: 'Either party may terminate upon 30 days notice.',
          plainExplanation: 'You or the employer can leave after giving 30 days notice.',
          whyItMatters: 'Protects you from immediate unexpected exit without notice.',
          concernLevel: 'informational',
          pageNumber: 1,
          sectionHeading: 'Section 3',
        },
      ],
      findings: [
        {
          id: 'f1',
          documentId: 'd1',
          category: 'high_attention',
          finding: '12-month nationwide non-compete clause',
          whyItMatters: 'Restricts working for competing businesses for a full year.',
          sourceReference: 'Section 4',
          pageNumber: 1,
          sectionHeading: 'Section 4. Restrictive Covenants',
          questionsToConsider: ['Is the geographic scope enforceable in your state?'],
          suggestedProfessionalFollowUp: 'Consult a local employment attorney.',
        },
      ],
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };

    it('renders plain language summary and switches to clauses and findings tabs', () => {
      render(
        <AnalysisView
          document={mockDoc}
          analysis={mockAnalysis}
          onOpenChat={vi.fn()}
          onOpenBriefing={vi.fn()}
          onOpenSearch={vi.fn()}
        />
      );

      expect(screen.getByText('Executive Agreement')).toBeDefined();
      expect(screen.getByText(/Executive employment terms and restrictive covenants/i)).toBeDefined();
      expect(screen.getByText('Pay base salary of $185,000')).toBeDefined();

      // Switch to clauses tab
      const clausesTab = screen.getByRole('tab', { name: /important clauses/i });
      fireEvent.click(clausesTab);
      expect(screen.getByText(/Termination for Convenience/i)).toBeDefined();
      expect(screen.getByText(/You or the employer can leave after giving 30 days notice/i)).toBeDefined();

      // Switch to risks/findings tab
      const risksTab = screen.getByRole('tab', { name: /risk & attention/i });
      fireEvent.click(risksTab);
      expect(screen.getByText('12-month nationwide non-compete clause')).toBeDefined();
      expect(screen.getByText(/Consult a local employment attorney/i)).toBeDefined();
    });
  });

  describe('DocumentSearch', () => {
    it('performs document keyword search via api and renders matches', async () => {
      vi.spyOn(api, 'searchDocument').mockResolvedValueOnce({
        results: [
          {
            chunkId: 'chunk1',
            pageNumber: 1,
            sectionHeading: 'Section 4. Restrictive Covenants',
            matchedSnippet: 'Employee agrees not to compete for twelve months...',
          },
        ],
      });

      render(<DocumentSearch documentId="d1" documentTitle="Employment Contract" onBack={vi.fn()} />);

      expect(screen.getByRole('heading', { name: /search document/i })).toBeDefined();

      const input = screen.getByPlaceholderText(/search clauses, terms/i);
      fireEvent.change(input, { target: { value: 'compete' } });

      const form = input.closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(api.searchDocument).toHaveBeenCalledWith('d1', 'compete');
        expect(screen.getByText(/twelve months/i)).toBeDefined();
      });
    });
  });

  describe('DocumentComparison', () => {
    const mockDocs: LegalDocumentDTO[] = [
      {
        id: 'd1',
        userId: 'u1',
        title: 'Vendor Agreement V1',
        originalFilename: 'v1.txt',
        mimeType: 'text/plain',
        fileSizeBytes: 1000,
        pageCount: 1,
        characterCount: 500,
        status: 'ready',
        errorMessage: null,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'd2',
        userId: 'u1',
        title: 'Vendor Agreement V2',
        originalFilename: 'v2.txt',
        mimeType: 'text/plain',
        fileSizeBytes: 1000,
        pageCount: 1,
        characterCount: 500,
        status: 'ready',
        errorMessage: null,
        createdAt: '',
        updatedAt: '',
      },
    ];

    it('triggers comparison between two documents and displays diffs', async () => {
      const mockComparison: ComparisonDTO = {
        id: 'cmp1',
        userId: 'u1',
        documentAId: 'd1',
        documentBId: 'd2',
        documentATitle: 'Vendor Agreement V1',
        documentBTitle: 'Vendor Agreement V2',
        executiveSummary: 'Comparison between V1 and V2 logistics contracts.',
        addedClauses: [],
        removedClauses: [],
        modifiedClauses: [],
        changedObligations: [],
        changedFinancialTerms: [],
        changedDates: [],
        changedTermination: [],
        changedLiability: [
          {
            category: 'Liability',
            documentA: 'Liability capped at $50,000',
            documentB: 'Liability is uncapped',
            difference: 'Removal of liability limitation cap in V2',
            whyItMatters: 'Substantially elevates commercial risk',
            impactLevel: 'significant',
          },
        ],
        changedDisputeResolution: [],
        createdAt: new Date().toISOString(),
      };

      vi.spyOn(api, 'compareDocuments').mockResolvedValueOnce({
        comparison: mockComparison,
      });

      render(<DocumentComparison documents={mockDocs} onDocumentCreated={vi.fn()} />);

      const compareBtn = screen.getByRole('button', { name: /^compare documents$/i });
      fireEvent.click(compareBtn);

      await waitFor(() => {
        expect(api.compareDocuments).toHaveBeenCalledWith('d1', 'd2');
        expect(screen.getByText('Comparison between V1 and V2 logistics contracts.')).toBeDefined();
        expect(screen.getByText('Removal of liability limitation cap in V2')).toBeDefined();
        expect(screen.getByText(/substantially elevates commercial risk/i)).toBeDefined();
      });
    });
  });

  describe('ChatInterface', () => {
    const mockDoc: LegalDocumentDTO = {
      id: 'd1',
      userId: 'u1',
      title: 'Commercial Lease',
      originalFilename: 'lease.txt',
      mimeType: 'text/plain',
      fileSizeBytes: 1000,
      pageCount: 1,
      characterCount: 500,
      status: 'ready',
      errorMessage: null,
      createdAt: '',
      updatedAt: '',
    };

    it('loads chat history and submits grounded question with citations', async () => {
      vi.spyOn(api, 'getChatHistory').mockResolvedValueOnce({
        messages: [
          {
            id: 'm1',
            userId: 'u1',
            documentId: 'd1',
            role: 'user',
            content: 'When is rent due?',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'm2',
            userId: 'u1',
            documentId: 'd1',
            role: 'assistant',
            content: 'Rent is due on the 1st of each calendar month.',
            structuredAnswer: {
              shortAnswer: 'Rent is due on the 1st of each month.',
              whatTheDocumentSays: 'Tenant shall pay monthly rent on or before the 1st day.',
              whyItMatters: 'Late fees apply after the 5th.',
              sourceCitations: [
                {
                  chunkId: 'c1',
                  pageNumber: 1,
                  sectionHeading: 'Section 2. Monthly Rent',
                  textSnippet: 'Due on the first day of each calendar month.',
                },
              ],
              questionsForLawyer: ['What grace periods are granted by local tenancy statutes?'],
              grounded: true,
            },
            createdAt: new Date().toISOString(),
          },
        ],
      });

      render(<ChatInterface document={mockDoc} />);

      await waitFor(() => {
        expect(api.getChatHistory).toHaveBeenCalledWith('d1');
        expect(screen.getByText('When is rent due?')).toBeDefined();
        expect(screen.getByText('Rent is due on the 1st of each month.')).toBeDefined();
        expect(screen.getByText(/Document Source Citation/i)).toBeDefined();
      });

      // Expand citations
      const citationsBtn = screen.getByRole('button', { name: /Document Source Citation/i });
      fireEvent.click(citationsBtn);

      await waitFor(() => {
        expect(screen.getByText(/Section 2\. Monthly Rent/i)).toBeDefined();
      });
    });
  });

  describe('ActionableBriefingView', () => {
    const mockDoc: LegalDocumentDTO = {
      id: 'd1',
      userId: 'u1',
      title: 'SaaS Agreement',
      originalFilename: 'saas.txt',
      mimeType: 'text/plain',
      fileSizeBytes: 1000,
      pageCount: 1,
      characterCount: 500,
      status: 'ready',
      errorMessage: null,
      createdAt: '',
      updatedAt: '',
    };

    const mockBriefing: LegalBriefingDTO = {
      id: 'b1',
      userId: 'u1',
      documentId: 'd1',
      documentTitle: 'SaaS Agreement',
      conciseSummary: 'Briefing for attorney consultation on software SLA and termination.',
      lawyerChecklist: {
        questionsToAsk: ['Are SLA remedies exclusive or cumulative?'],
        documentsToBring: ['Service Level Agreement Addendum'],
        keyConcerns: ['Unilateral price increase on auto-renewal'],
        importantDeadlines: ['60-day non-renewal notice'],
        clarificationAreas: [],
      },
      actionChecklist: [
        {
          id: 'item1',
          category: 'Renewal',
          label: 'Calendar 60-day cancellation notice deadline',
          completed: false,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('loads briefing, toggles action checklist item, and triggers markdown export', async () => {
      vi.spyOn(api, 'getBriefing').mockResolvedValueOnce({
        briefing: mockBriefing,
      });
      vi.spyOn(api, 'toggleChecklist').mockResolvedValueOnce({
        briefing: {
          ...mockBriefing,
          actionChecklist: [{ ...mockBriefing.actionChecklist[0], completed: true }],
        },
      });
      vi.spyOn(api, 'exportBriefingMarkdown').mockResolvedValueOnce('# Legal Briefing: SaaS Agreement');

      render(<ActionableBriefingView document={mockDoc} />);

      await waitFor(() => {
        expect(screen.getByText('SaaS Agreement')).toBeDefined();
        expect(screen.getByText('Are SLA remedies exclusive or cumulative?')).toBeDefined();
        expect(screen.getByText('Calendar 60-day cancellation notice deadline')).toBeDefined();
      });

      // Toggle item
      const checkbox = screen.getByRole('checkbox', { name: /calendar 60-day cancellation notice deadline/i });
      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(api.toggleChecklist).toHaveBeenCalledWith('d1', 'item1', true);
      });
    });
  });

  describe('UserProfileView', () => {
    it('displays user profile details and executes account deletion confirmation', async () => {
      const onAccountDeleted = vi.fn();

      vi.spyOn(api, 'deleteAccount').mockResolvedValueOnce({
        success: true,
        message: 'Account deleted',
      });

      render(
        <UserProfileView
          user={{
            id: 'user-123',
            name: 'Robert Vance',
            email: 'robert@vance.com',
            createdAt: '2025-01-01',
            updatedAt: '2025-01-01',
          }}
          documentCount={2}
          onAccountDeleted={onAccountDeleted}
        />
      );

      expect(screen.getByText('Robert Vance')).toBeDefined();
      expect(screen.getByText('robert@vance.com')).toBeDefined();
      expect(screen.getByText('2 active contract(s)')).toBeDefined();

      const deleteBtn = screen.getByRole('button', { name: /delete account & data/i });
      fireEvent.click(deleteBtn);

      const confirmBtn = screen.getByRole('button', { name: /yes, delete everything/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(api.deleteAccount).toHaveBeenCalled();
        expect(onAccountDeleted).toHaveBeenCalled();
      });
    });
  });

  describe('ApiClient Service', () => {
    it('manages auth tokens in memory and session storage', () => {
      api.setToken('test-token-jwt-123');
      expect(api.getToken()).toBe('test-token-jwt-123');
      expect(sessionStorage.getItem('legallens_token')).toBe('test-token-jwt-123');

      api.logout();
      expect(api.getToken()).toBeNull();
      expect(sessionStorage.getItem('legallens_token')).toBeNull();
    });

    it('attaches Bearer token in fetch requests', async () => {
      api.setToken('auth-sample-token');
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ status: 'healthy' }),
      } as any);

      const res = await api.request<{ status: string }>('/api/health');
      expect(res.status).toBe('healthy');
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/health',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer auth-sample-token',
          }),
        })
      );
    });

    it('parses error message from response on failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ error: { message: 'Custom server validation error' } }),
      } as any);

      await expect(api.request('/api/fail')).rejects.toThrow('Custom server validation error');
    });
  });
});
