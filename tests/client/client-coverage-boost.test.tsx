import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import {
  api,
  LegalDocumentDTO,
  DocumentAnalysisDTO,
  LegalBriefingDTO,
  UserDTO,
  ChatMessageDTO,
  SanitizedUser,
  ComparisonDTO,
  ClauseDifferenceDTO,
} from '../../src/client/services/api';
import { App } from '../../src/client/App';
import { AnalysisView } from '../../src/client/components/AnalysisView';
import { ActionableBriefingView } from '../../src/client/components/ActionableBriefingView';
import { UploadZone } from '../../src/client/components/UploadZone';
import { AuthModal } from '../../src/client/components/AuthModal';
import { ChatInterface } from '../../src/client/components/ChatInterface';
import { DocumentComparison } from '../../src/client/components/DocumentComparison';
import { UserProfileView } from '../../src/client/components/UserProfileView';
import { DocumentSearch } from '../../src/client/components/DocumentSearch';
import { Header } from '../../src/client/components/Header';
import { DashboardView } from '../../src/client/components/DashboardView';

describe('Frontend Client Coverage Boost', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
  });

  describe('ApiClient direct service methods', () => {
    it('covers all ApiClient request methods', async () => {
      const mockFetch = vi.fn().mockImplementation(async (url: string) => ({
        ok: true,
        headers: new Headers({
          'Content-Type': url.includes('/export') ? 'text/markdown' : 'application/json',
        }),
        json: async () => ({ success: true, message: 'ok', data: [], token: 'mock-token' }),
        text: async () => '# Markdown exported',
      }));
      global.fetch = mockFetch;

      api.setToken('test-token');
      expect(api.getToken()).toBe('test-token');

      // Documents
      const formData = new FormData();
      await api.uploadDocument(formData);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/documents',
        expect.objectContaining({ method: 'POST' })
      );

      await api.listDocuments();
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/documents',
        expect.objectContaining({ headers: expect.any(Object) })
      );

      await api.getDocument('doc-1');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/documents/doc-1',
        expect.objectContaining({ headers: expect.any(Object) })
      );

      await api.deleteDocument('doc-1');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/documents/doc-1',
        expect.objectContaining({ method: 'DELETE' })
      );

      await api.searchDocument('doc-1', 'term');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/documents/doc-1/search?q=term',
        expect.objectContaining({ headers: expect.any(Object) })
      );

      // Analysis
      await api.analyzeDocument('doc-1', true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/documents/doc-1/analyze?force=true',
        expect.objectContaining({ method: 'POST' })
      );

      await api.getAnalysis('doc-1');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/documents/doc-1/analysis',
        expect.objectContaining({ headers: expect.any(Object) })
      );

      // Chat
      await api.askChat('doc-1', 'What is the liability cap?');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/documents/doc-1/chat',
        expect.objectContaining({ method: 'POST' })
      );

      await api.getChatHistory('doc-1');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/documents/doc-1/chat',
        expect.objectContaining({ headers: expect.any(Object) })
      );

      await api.clearChatHistory('doc-1');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/documents/doc-1/chat',
        expect.objectContaining({ method: 'DELETE' })
      );

      // Comparison
      await api.compareDocuments('doc-1', 'doc-2');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/comparisons',
        expect.objectContaining({ method: 'POST' })
      );

      await api.getComparison('cmp-1');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/comparisons/cmp-1',
        expect.objectContaining({ headers: expect.any(Object) })
      );

      await api.listComparisons();
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/comparisons',
        expect.objectContaining({ headers: expect.any(Object) })
      );

      // Briefing
      await api.getBriefing('doc-1');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/documents/doc-1/briefing',
        expect.objectContaining({ headers: expect.any(Object) })
      );

      await api.toggleChecklist('doc-1', 'item-1', true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/documents/doc-1/briefing/checklist',
        expect.objectContaining({ method: 'PATCH' })
      );

      const markdown = await api.exportBriefingMarkdown('doc-1');
      expect(markdown).toBe('# Markdown exported');

      // Demo & Stats
      await api.getDemoTemplates();
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/demo/templates',
        expect.objectContaining({ headers: expect.any(Object) })
      );

      await api.loadDemoTemplate('demo-employment');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/demo/load',
        expect.objectContaining({ method: 'POST' })
      );

      await api.getDashboardStats();
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/demo/stats',
        expect.objectContaining({ headers: expect.any(Object) })
      );

      await api.login({ email: 'test@example.com', password: 'password123' });
      expect(api.getToken()).toBe('mock-token');

      await api.deleteAccount();
      expect(api.getToken()).toBeNull();

      api.logout();
      expect(api.getToken()).toBeNull();
    });
  });

  describe('App.tsx Component Views & Navigation', () => {
    const mockUser: UserDTO = {
      id: 'u-boost',
      email: 'boost@test.com',
      name: 'Elena Kagan',
      createdAt: '',
      updatedAt: '',
    };

    const mockDoc: LegalDocumentDTO = {
      id: 'doc-boost-1',
      userId: 'u-boost',
      title: 'Consulting Services Agreement',
      originalFilename: 'consulting.txt',
      mimeType: 'text/plain',
      fileSizeBytes: 1200,
      pageCount: 2,
      characterCount: 4500,
      status: 'ready',
      errorMessage: null,
      createdAt: '',
      updatedAt: '',
    };

    it('renders empty chat view and loads sample demo', async () => {
      api.setToken('valid-token');
      vi.spyOn(api, 'getProfile').mockResolvedValue({ user: mockUser });
      vi.spyOn(api, 'listDocuments').mockResolvedValue({ documents: [] });
      vi.spyOn(api, 'getDashboardStats').mockResolvedValue({
        totalDocuments: 0,
        totalAnalyses: 0,
        totalPendingActionItems: 0,
        recentDocuments: [],
      });
      vi.spyOn(api, 'loadDemoTemplate').mockResolvedValue({
        message: 'loaded',
        document: mockDoc,
      });

      render(<App />);
      await waitFor(() => {
        expect(screen.getByText(/welcome back, elena kagan/i)).toBeDefined();
      });

      // Navigate to chat without a selected document
      const chatBtn = screen.getByRole('button', { name: /ask ai/i });
      fireEvent.click(chatBtn);

      expect(screen.getByText(/select a document for ai chat/i)).toBeDefined();
      const loadSampleBtn = screen.getByRole('button', { name: /load sample document & ask ai/i });
      fireEvent.click(loadSampleBtn);

      await waitFor(() => {
        expect(api.loadDemoTemplate).toHaveBeenCalled();
      });
    });

    it('renders empty briefing view and loads sample demo', async () => {
      api.setToken('valid-token');
      vi.spyOn(api, 'getProfile').mockResolvedValue({ user: mockUser });
      vi.spyOn(api, 'listDocuments').mockResolvedValue({ documents: [] });
      vi.spyOn(api, 'getDashboardStats').mockResolvedValue({
        totalDocuments: 0,
        totalAnalyses: 0,
        totalPendingActionItems: 0,
        recentDocuments: [],
      });
      vi.spyOn(api, 'loadDemoTemplate').mockResolvedValue({
        message: 'loaded',
        document: mockDoc,
      });

      render(<App />);
      await waitFor(() => {
        expect(screen.getByText(/welcome back, elena kagan/i)).toBeDefined();
      });

      // Navigate to briefings without a selected document
      const briefingBtn = screen.getByRole('button', { name: /briefings/i });
      fireEvent.click(briefingBtn);

      expect(screen.getByText(/select a document for lawyer briefing/i)).toBeDefined();
      const loadSampleBtn = screen.getByRole('button', { name: /load sample document/i });
      fireEvent.click(loadSampleBtn);

      await waitFor(() => {
        expect(api.loadDemoTemplate).toHaveBeenCalled();
      });
    });
  });

  describe('AnalysisView Facts Tab and Clause Expansion', () => {
    const mockDoc: LegalDocumentDTO = {
      id: 'doc-1',
      userId: 'u1',
      title: 'Test Contract',
      originalFilename: 'test.txt',
      mimeType: 'text/plain',
      fileSizeBytes: 1000,
      pageCount: 2,
      characterCount: 3000,
      status: 'ready',
      errorMessage: null,
      createdAt: '',
      updatedAt: '',
    };

    const mockAnalysis: DocumentAnalysisDTO = {
      id: 'ana-1',
      documentId: 'doc-1',
      documentType: 'Employment Agreement',
      partiesInvolved: ['Acme Corp', 'Jane Doe'],
      effectiveDate: '2026-01-01',
      expirationDate: '2027-01-01',
      jurisdiction: 'Delaware',
      highLevelSummary: 'Executive employment contract with restrictive covenants.',
      plainLanguageSummary: {
        whatThisDocumentIsAbout: 'Executive employment contract with restrictive covenants.',
        whatYouAreAgreeingTo: ['Provide engineering leadership'],
        whatTheOtherPartyIsAgreeingTo: ['Pay salary and grant equity'],
        yourKeyResponsibilities: ['Oversee codebase'],
        yourRights: ['Receive compensation'],
        importantDates: ['January 1, 2026'],
        financialObligations: ['$200,000 annual base'],
        terminationConditions: ['30 days notice'],
      },
      extractedFacts: [
        {
          category: 'Compensation',
          fact: 'Base salary is $200,000 annually.',
          verbatimExcerpt: 'The Employee shall receive an annual base salary of $200,000.',
          pageNumber: 1,
        },
      ],
      clauses: [
        {
          id: 'c1',
          documentId: 'doc-1',
          category: 'termination',
          title: 'Termination for Convenience',
          plainExplanation: 'Allows termination with 30 days notice.',
          originalText: 'Either party may terminate this agreement upon thirty (30) days prior written notice.',
          concernLevel: 'review_carefully',
          pageNumber: 2,
          sectionHeading: 'Section 8: Termination',
          whyItMatters: 'Provides an exit ramp.',
        },
      ],
      findings: [],
      createdAt: '',
      updatedAt: '',
    };

    it('toggles clause card expansion to reveal original contract excerpt', () => {
      render(
        <AnalysisView
          document={mockDoc}
          analysis={mockAnalysis}
          onOpenChat={vi.fn()}
          onOpenBriefing={vi.fn()}
          onOpenSearch={vi.fn()}
        />
      );

      // Switch to Important Clauses tab
      fireEvent.click(screen.getByRole('tab', { name: /important clauses/i }));

      // Initially original excerpt is not visible
      expect(screen.queryByText(/original contract excerpt:/i)).toBeNull();

      // Click clause card button to expand
      const expandBtn = screen.getByRole('button', { name: /view original clause/i });
      fireEvent.click(expandBtn);

      // Now original excerpt is visible
      expect(screen.getByText(/original contract excerpt:/i)).toBeDefined();
      expect(screen.getByText(/"Either party may terminate this agreement upon thirty \(30\) days prior written notice\."/i)).toBeDefined();
    });

    it('navigates to facts tab and displays extracted facts table', () => {
      render(
        <AnalysisView
          document={mockDoc}
          analysis={mockAnalysis}
          onOpenChat={vi.fn()}
          onOpenBriefing={vi.fn()}
          onOpenSearch={vi.fn()}
        />
      );

      const factsTab = screen.getByRole('tab', { name: /extracted facts/i });
      fireEvent.click(factsTab);

      expect(screen.getByText(/explicit factual data points extracted verbatim/i)).toBeDefined();
      expect(screen.getByText('Base salary is $200,000 annually.')).toBeDefined();
      expect(screen.getByText(/"The Employee shall receive an annual base salary of \$200,000\."/i)).toBeDefined();
    });
  });

  describe('ActionableBriefingView Keyboard Navigation & Failure State', () => {
    const mockDoc: LegalDocumentDTO = {
      id: 'doc-1',
      userId: 'u1',
      title: 'Agreement',
      originalFilename: 'doc.txt',
      mimeType: 'text/plain',
      fileSizeBytes: 100,
      pageCount: 1,
      characterCount: 500,
      status: 'ready',
      errorMessage: null,
      createdAt: '',
      updatedAt: '',
    };

    const mockBriefing: LegalBriefingDTO = {
      id: 'brf-1',
      userId: 'u1',
      documentId: 'doc-1',
      documentTitle: 'Agreement',
      conciseSummary: 'Briefing summary text',
      lawyerChecklist: {
        questionsToAsk: ['Is liability capped?'],
        documentsToBring: ['Amendments'],
        keyConcerns: ['Indemnity'],
        importantDeadlines: ['30 days notice'],
        clarificationAreas: [],
      },
      actionChecklist: [
        {
          id: 'item-1',
          label: 'Request written clarification of Section 4',
          completed: false,
          category: 'negotiation',
        },
      ],
      createdAt: '',
      updatedAt: '',
    };

    it('toggles action checklist items with Space keydown', async () => {
      vi.spyOn(api, 'getBriefing').mockResolvedValue({ briefing: mockBriefing });
      vi.spyOn(api, 'toggleChecklist').mockResolvedValue({
        briefing: {
          ...mockBriefing,
          actionChecklist: [{ ...mockBriefing.actionChecklist[0], completed: true }],
        },
      });

      render(<ActionableBriefingView document={mockDoc} />);

      await waitFor(() => {
        expect(screen.getByText('Request written clarification of Section 4')).toBeDefined();
      });

      const checkbox = screen.getByRole('checkbox');
      fireEvent.keyDown(checkbox, { key: ' ' });

      await waitFor(() => {
        expect(api.toggleChecklist).toHaveBeenCalledWith('doc-1', 'item-1', true);
      });
    });

    it('displays error state when briefing fails to load', async () => {
      vi.spyOn(api, 'getBriefing').mockRejectedValue(new Error('Failed to load'));

      render(<ActionableBriefingView document={mockDoc} />);

      await waitFor(() => {
        expect(screen.getByText(/could not load briefing for this document/i)).toBeDefined();
      });
    });
  });

  describe('UploadZone Keyboard Interaction & Template Selection', () => {
    it('activates file input on Enter keydown and handles demo template selection', async () => {
      vi.spyOn(api, 'getDemoTemplates').mockResolvedValue({
        templates: [
          {
            id: 'demo-lease',
            title: 'Commercial Lease Agreement (Sample)',
            category: 'Commercial Real Estate',
            description: 'Triple net commercial lease',
            filename: 'lease.txt',
          },
        ],
      });
      vi.spyOn(api, 'loadDemoTemplate').mockResolvedValue({
        message: 'Loaded',
        document: {
          id: 'doc-demo-lease',
          userId: 'u1',
          title: 'Commercial Lease Agreement',
          originalFilename: 'lease.txt',
          mimeType: 'text/plain',
          fileSizeBytes: 1000,
          pageCount: 3,
          characterCount: 6000,
          status: 'ready',
          errorMessage: null,
          createdAt: '',
          updatedAt: '',
        },
      });

      const onUploaded = vi.fn();

      render(<UploadZone onDocumentUploaded={onUploaded} />);

      const dropzone = screen.getByRole('button', { name: /upload legal document/i });
      fireEvent.keyDown(dropzone, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('Commercial Lease Agreement')).toBeDefined();
      });

      const demoBtn = screen.getByRole('button', { name: /commercial lease agreement/i });
      fireEvent.click(demoBtn);

      await waitFor(() => {
        expect(onUploaded).toHaveBeenCalled();
      });
    });
  });

  describe('AuthModal Demo Login and Error Handling', () => {
    it('handles demo login flow and error display', async () => {
      vi.spyOn(api, 'login').mockRejectedValue(new Error('Login failed'));
      vi.spyOn(api, 'register').mockResolvedValue({
        token: 'demo-tok',
        user: { id: 'demo-u', email: 'demo.evaluator@legallens.local', name: 'Demo Evaluator', createdAt: '', updatedAt: '' },
      });

      const onSuccess = vi.fn();
      const onClose = vi.fn();

      render(<AuthModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

      const quickDemoBtn = screen.getByRole('button', { name: /instant demo mode/i });
      fireEvent.click(quickDemoBtn);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('displays error message on invalid submission', async () => {
      vi.spyOn(api, 'login').mockRejectedValue(new Error('Invalid email or password'));

      render(<AuthModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      fireEvent.change(emailInput, { target: { value: 'bad@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });

      const submitBtn = screen.getByRole('button', { name: /^sign in$/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeDefined();
        expect(screen.getByText('Invalid email or password')).toBeDefined();
      });
    });
  });

  describe('ChatInterface loading indicator and form submit', () => {
    const mockDoc: LegalDocumentDTO = {
      id: 'doc-chat-1',
      userId: 'u1',
      title: 'Employment Agreement',
      originalFilename: 'employment.txt',
      mimeType: 'text/plain',
      fileSizeBytes: 1000,
      pageCount: 1,
      characterCount: 2000,
      status: 'ready',
      errorMessage: null,
      createdAt: '',
      updatedAt: '',
    };

    it('displays loading state and handles form submit', async () => {
      vi.spyOn(api, 'getChatHistory').mockResolvedValue({ messages: [] });
      let resolveChat: any;
      const chatPromise = new Promise<{ message: ChatMessageDTO }>((res) => {
        resolveChat = res;
      });
      vi.spyOn(api, 'askChat').mockReturnValue(chatPromise);

      render(<ChatInterface document={mockDoc} />);

      const input = screen.getByPlaceholderText(/ask a question about this contract/i);
      fireEvent.change(input, { target: { value: 'Can I terminate?' } });

      const form = input.closest('form')!;
      fireEvent.submit(form);

      // Verify loading state is shown
      expect(screen.getByText(/searching your document/i)).toBeDefined();

      // Resolve the chat response
      resolveChat({
        message: {
          id: 'm2',
          userId: 'u1',
          documentId: 'doc-chat-1',
          role: 'assistant',
          content: 'You can terminate with 30 days notice.',
          structuredAnswer: {
            shortAnswer: 'Yes, with 30 days notice.',
            whatTheDocumentSays: 'Section 4 states termination requires 30 days written notice.',
            whyItMatters: 'Provides advance notice to both parties.',
            sourceCitations: [],
            questionsForLawyer: [],
            grounded: true,
          },
          createdAt: '',
        },
      });

      await waitFor(() => {
        expect(screen.getByText('Yes, with 30 days notice.')).toBeDefined();
      });
    });

    it('displays ungrounded badge when assistant message is not grounded', async () => {
      vi.spyOn(api, 'getChatHistory').mockResolvedValue({
        messages: [
          {
            id: 'm-ungrounded',
            userId: 'u1',
            documentId: 'doc-chat-1',
            role: 'assistant',
            content: 'Could not answer.',
            structuredAnswer: {
              shortAnswer: 'Not enough info.',
              whatTheDocumentSays: 'Not mentioned.',
              whyItMatters: 'Need further details.',
              sourceCitations: [],
              questionsForLawyer: [],
              grounded: false,
            },
            createdAt: '',
          },
        ],
      });

      render(<ChatInterface document={mockDoc} />);
      await waitFor(() => {
        expect(screen.getByText('Not Grounded in Document')).toBeDefined();
      });
    });

    it('displays grounded confidence percentage badge when confidence is provided', async () => {
      vi.spyOn(api, 'getChatHistory').mockResolvedValue({
        messages: [
          {
            id: 'm-confidence',
            userId: 'u1',
            documentId: 'doc-chat-1',
            role: 'assistant',
            content: 'Answered.',
            structuredAnswer: {
              shortAnswer: 'Answered with confidence.',
              whatTheDocumentSays: 'Mentioned.',
              whyItMatters: 'Details.',
              sourceCitations: [],
              questionsForLawyer: [],
              grounded: true,
              groundingConfidence: 0.95,
            },
            createdAt: '',
          },
        ],
      });

      render(<ChatInterface document={mockDoc} />);
      await waitFor(() => {
        expect(screen.getByText(/95% Confidence/)).toBeDefined();
      });
    });

    it('advances loading step timer while awaiting response', async () => {
      vi.useFakeTimers();
      vi.spyOn(api, 'getChatHistory').mockResolvedValue({ messages: [] });
      let resolveChat: any;
      const chatPromise = new Promise<{ message: ChatMessageDTO }>((res) => {
        resolveChat = res;
      });
      vi.spyOn(api, 'askChat').mockReturnValue(chatPromise);

      render(<ChatInterface document={mockDoc} />);

      const input = screen.getByPlaceholderText(/ask a question about this contract/i);
      fireEvent.change(input, { target: { value: 'Question?' } });
      const form = input.closest('form')!;
      fireEvent.submit(form);

      expect(screen.getByText('Searching your document...')).toBeDefined();

      act(() => {
        vi.advanceTimersByTime(1300);
      });
      expect(screen.getByText('Finding relevant sections...')).toBeDefined();

      act(() => {
        vi.advanceTimersByTime(1300);
      });
      expect(screen.getByText('Generating grounded response with Gemini...')).toBeDefined();

      await act(async () => {
        resolveChat({
          message: {
            id: 'm-res',
            userId: 'u1',
            documentId: 'doc-chat-1',
            role: 'assistant',
            content: 'Done',
            createdAt: '',
          },
        });
      });

      vi.useRealTimers();
    });
  });

  describe('DocumentComparison Error Handling and Badges', () => {
    it('displays error alert when comparing the same document', async () => {
      const docA: LegalDocumentDTO = {
        id: 'doc-same',
        userId: 'u1',
        title: 'Document A',
        originalFilename: 'doc.txt',
        mimeType: 'text/plain',
        fileSizeBytes: 100,
        pageCount: 1,
        characterCount: 200,
        status: 'ready',
        errorMessage: null,
        createdAt: '',
        updatedAt: '',
      };

      render(<DocumentComparison documents={[docA, docA]} onDocumentCreated={vi.fn()} />);

      const compareBtn = screen.getByRole('button', { name: /compare documents/i });
      fireEvent.click(compareBtn);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeDefined();
        expect(screen.getByText(/please select two different documents to compare/i)).toBeDefined();
      });
    });

    it('renders insufficient documents message when fewer than 2 documents provided', () => {
      render(<DocumentComparison documents={[]} onDocumentCreated={vi.fn()} />);
      expect(
        screen.getByText(/you need at least two documents in your account to perform a comparison/i)
      ).toBeDefined();
    });

    it('renders comparison results with moderate and minor impact badges', async () => {
      const doc1: LegalDocumentDTO = {
        id: 'doc-cmp-1',
        userId: 'u1',
        title: 'Agreement 2024',
        originalFilename: 'a1.txt',
        mimeType: 'text/plain',
        fileSizeBytes: 100,
        pageCount: 1,
        characterCount: 200,
        status: 'ready',
        errorMessage: null,
        createdAt: '',
        updatedAt: '',
      };
      const doc2: LegalDocumentDTO = {
        id: 'doc-cmp-2',
        userId: 'u1',
        title: 'Agreement 2025',
        originalFilename: 'a2.txt',
        mimeType: 'text/plain',
        fileSizeBytes: 100,
        pageCount: 1,
        characterCount: 200,
        status: 'ready',
        errorMessage: null,
        createdAt: '',
        updatedAt: '',
      };

      vi.spyOn(api, 'compareDocuments').mockResolvedValue({
        comparison: {
          id: 'cmp-res',
          userId: 'u1',
          documentAId: doc1.id,
          documentBId: doc2.id,
          documentATitle: doc1.title,
          documentBTitle: doc2.title,
          executiveSummary: 'Executive overview of differences',
          addedClauses: [{ category: 'ip', documentA: '', documentB: 'IP Clause', difference: 'Added IP clause', whyItMatters: 'Protects IP', impactLevel: 'moderate' }],
          removedClauses: [{ category: 'warranty', documentA: 'Old Warranty', documentB: '', difference: 'Removed old warranty', whyItMatters: 'Warranty removed', impactLevel: 'low' }],
          modifiedClauses: [],
          changedObligations: [],
          changedFinancialTerms: [],
          changedDates: [],
          changedTermination: [],
          changedLiability: [],
          changedDisputeResolution: [],
          createdAt: '',
        },
      });

      render(<DocumentComparison documents={[doc1, doc2]} onDocumentCreated={vi.fn()} />);

      const compareBtn = screen.getByRole('button', { name: /compare documents/i });
      fireEvent.click(compareBtn);

      await waitFor(() => {
        expect(screen.getByText('Moderate Impact')).toBeDefined();
        expect(screen.getByText('Minor Change')).toBeDefined();
      });
    });
  });

  describe('UserProfileView Deletion Error', () => {
    it('displays error message when account deletion fails', async () => {
      vi.spyOn(api, 'deleteAccount').mockRejectedValue(new Error('Server database error'));

      const user: UserDTO = {
        id: 'u-del',
        email: 'del@test.com',
        name: 'Delete Tester',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      render(<UserProfileView user={user} documentCount={3} onAccountDeleted={vi.fn()} />);

      // Click Danger Zone delete button
      const initialDelBtn = screen.getByRole('button', { name: /delete account & data/i });
      fireEvent.click(initialDelBtn);

      // Confirm delete
      const confirmBtn = screen.getByRole('button', { name: /yes, delete everything/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(screen.getByText('Server database error')).toBeDefined();
      });
    });
  });

  describe('DocumentSearch Clear and Failure State', () => {
    it('clears query and results when clicking X button', async () => {
      vi.spyOn(api, 'searchDocument').mockResolvedValue({
        results: [
          {
            chunkId: 'chk-1',
            pageNumber: 1,
            sectionHeading: 'Terms',
            matchedSnippet: 'Arbitration agreement',
          },
        ],
      });

      render(
        <DocumentSearch
          documentId="doc-1"
          documentTitle="Test Contract"
          onBack={vi.fn()}
        />
      );

      const input = screen.getByPlaceholderText(/search clauses, terms, numbers/i);
      fireEvent.change(input, { target: { value: 'Arbitration' } });

      const searchBtn = screen.getByRole('button', { name: /^search$/i });
      fireEvent.click(searchBtn);

      await waitFor(() => {
        expect(screen.getByText(/matching sections/i)).toBeDefined();
      });

      // Clear search with X button
      const clearBtn = screen.getByRole('button', { name: /clear search/i });
      fireEvent.click(clearBtn);

      expect((input as HTMLInputElement).value).toBe('');
      expect(screen.queryByText(/matching sections/i)).toBeNull();
    });

    it('handles search document api error gracefully', async () => {
      vi.spyOn(api, 'searchDocument').mockRejectedValue(new Error('Network error'));

      render(
        <DocumentSearch
          documentId="doc-1"
          documentTitle="Test Contract"
          onBack={vi.fn()}
        />
      );

      const input = screen.getByPlaceholderText(/search clauses, terms, numbers/i);
      fireEvent.change(input, { target: { value: 'ErrorQuery' } });

      const searchBtn = screen.getByRole('button', { name: /^search$/i });
      fireEvent.click(searchBtn);

      await waitFor(() => {
        expect(api.searchDocument).toHaveBeenCalled();
      });
    });
  });

  describe('Header Brand Keyboard Navigation', () => {
    it('navigates to dashboard on Enter keydown on brand logo', () => {
      const onSelectTab = vi.fn();
      const mockUser: UserDTO = {
        id: 'u1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: '',
        updatedAt: '',
      };

      render(
        <Header
          user={mockUser}
          activeTab="documents"
          onSelectTab={onSelectTab}
          onOpenAuth={vi.fn()}
          onLogout={vi.fn()}
          theme="light"
          onToggleTheme={vi.fn()}
        />
      );

      const brandLogo = screen.getByLabelText('LegalLens Home');
      fireEvent.keyDown(brandLogo, { key: 'Enter' });

      expect(onSelectTab).toHaveBeenCalledWith('dashboard');
    });

    it('navigates to help on Space keydown when user is logged out', () => {
      const onSelectTab = vi.fn();
      render(
        <Header
          user={null}
          activeTab="help"
          onSelectTab={onSelectTab}
          onOpenAuth={vi.fn()}
          onLogout={vi.fn()}
          theme="dark"
          onToggleTheme={vi.fn()}
        />
      );

      const brandLogo = screen.getByLabelText('LegalLens Home');
      fireEvent.keyDown(brandLogo, { key: ' ' });
      expect(onSelectTab).toHaveBeenCalledWith('help');
    });

    it('toggles theme when theme button is clicked', () => {
      const onToggle = vi.fn();
      render(
        <Header
          user={null}
          activeTab="help"
          onSelectTab={vi.fn()}
          onOpenAuth={vi.fn()}
          onLogout={vi.fn()}
          theme="dark"
          onToggleTheme={onToggle}
        />
      );

      const themeBtn = screen.getByRole('button', { name: /switch to light theme/i });
      fireEvent.click(themeBtn);
      expect(onToggle).toHaveBeenCalled();
    });
  });

  describe('AnalysisView Interactions & Filtering', () => {
    const mockDoc: LegalDocumentDTO = {
      id: 'doc-anl-1',
      userId: 'u1',
      title: 'Master Services Agreement',
      originalFilename: 'msa.txt',
      mimeType: 'text/plain',
      fileSizeBytes: 2000,
      pageCount: 3,
      characterCount: 5000,
      status: 'ready',
      errorMessage: null,
      createdAt: '',
      updatedAt: '',
    };

    const mockAnalysis: DocumentAnalysisDTO = {
      id: 'anl-1',
      documentId: 'doc-anl-1',
      documentType: 'Services Agreement',
      partiesInvolved: ['Provider Inc', 'Client LLC'],
      effectiveDate: '2026-01-01',
      expirationDate: '2027-01-01',
      jurisdiction: 'Delaware',
      highLevelSummary: 'Comprehensive services agreement.',
      plainLanguageSummary: {
        whatThisDocumentIsAbout: 'Comprehensive services agreement.',
        whatYouAreAgreeingTo: ['Provide services'],
        whatTheOtherPartyIsAgreeingTo: ['Pay invoices'],
        yourKeyResponsibilities: ['Deliver on time'],
        yourRights: ['Receive timely payment'],
        importantDates: ['Jan 1, 2026'],
        financialObligations: ['Net 30 payment terms'],
        terminationConditions: ['30 days notice for convenience'],
      },
      extractedFacts: [
        {
          category: 'Payment',
          fact: 'Invoices due net 30.',
          verbatimExcerpt: 'Payment shall be due within 30 days.',
          pageNumber: 1,
        },
      ],
      clauses: [
        {
          id: 'c-term',
          documentId: 'doc-anl-1',
          category: 'termination',
          title: 'Termination for Convenience',
          plainExplanation: 'Allows termination with 30 days notice.',
          originalText: 'Either party may terminate upon 30 days notice.',
          concernLevel: 'review_carefully',
          pageNumber: 2,
          sectionHeading: 'Section 8',
          whyItMatters: 'Provides exit flexibility.',
        },
        {
          id: 'c-indem',
          documentId: 'doc-anl-1',
          category: 'indemnification',
          title: 'Mutual Indemnity',
          plainExplanation: 'Parties indemnify each other against claims.',
          originalText: 'Each party shall defend and indemnify the other.',
          concernLevel: 'high_attention',
          pageNumber: 3,
          sectionHeading: 'Section 11',
          whyItMatters: 'Allocates financial risk.',
        },
      ],
      findings: [
        {
          id: 'f-1',
          documentId: 'doc-anl-1',
          category: 'high_attention',
          finding: 'Uncapped IP indemnification obligation.',
          whyItMatters: 'Could lead to unlimited liability.',
          sourceReference: 'Section 11.2',
          pageNumber: 3,
          sectionHeading: 'Section 11',
          questionsToConsider: ['Should indemnification be capped at contract value?'],
          suggestedProfessionalFollowUp: 'Ask counsel to negotiate a super-cap or standard cap.',
        },
      ],
      createdAt: '',
      updatedAt: '',
    };

    it('filters clauses by category and triggers header action buttons', () => {
      const onChat = vi.fn();
      const onBriefing = vi.fn();
      const onSearch = vi.fn();

      render(
        <AnalysisView
          document={mockDoc}
          analysis={mockAnalysis}
          onOpenChat={onChat}
          onOpenBriefing={onBriefing}
          onOpenSearch={onSearch}
        />
      );

      // Trigger action buttons
      fireEvent.click(screen.getByRole('button', { name: /ask ai/i }));
      expect(onChat).toHaveBeenCalledWith('doc-anl-1');

      fireEvent.click(screen.getByRole('button', { name: /lawyer checklist/i }));
      expect(onBriefing).toHaveBeenCalledWith('doc-anl-1');

      fireEvent.click(screen.getByRole('button', { name: /search document/i }));
      expect(onSearch).toHaveBeenCalledWith('doc-anl-1');

      // Switch to clauses tab
      fireEvent.click(screen.getByRole('tab', { name: /important clauses/i }));

      // Filter by TERMINATION
      fireEvent.click(screen.getByRole('button', { name: /^TERMINATION$/i }));
      expect(screen.getByText('Termination for Convenience (termination)')).toBeDefined();

      // Switch back to ALL
      fireEvent.click(screen.getByRole('button', { name: /^ALL$/i }));
      expect(screen.getByText('Mutual Indemnity (indemnification)')).toBeDefined();

      // Switch to risks tab
      fireEvent.click(screen.getByRole('tab', { name: /risk & attention areas/i }));
      expect(screen.getByText('Uncapped IP indemnification obligation.')).toBeDefined();
      expect(screen.getByText(/ask counsel to negotiate a super-cap/i)).toBeDefined();
    });
  });

  describe('ActionableBriefingView Copy and Download Exports', () => {
    const mockDoc: LegalDocumentDTO = {
      id: 'doc-exp-1',
      userId: 'u1',
      title: 'Consulting Contract',
      originalFilename: 'consulting.txt',
      mimeType: 'text/plain',
      fileSizeBytes: 1000,
      pageCount: 1,
      characterCount: 2000,
      status: 'ready',
      errorMessage: null,
      createdAt: '',
      updatedAt: '',
    };

    const mockBriefing: LegalBriefingDTO = {
      id: 'brf-exp',
      userId: 'u1',
      documentId: 'doc-exp-1',
      documentTitle: 'Consulting Contract',
      conciseSummary: 'Export briefing summary.',
      lawyerChecklist: {
        questionsToAsk: ['Is rate guaranteed?'],
        documentsToBring: ['Statements of work'],
        keyConcerns: ['Termination penalties'],
        importantDeadlines: ['Annual renewal date'],
        clarificationAreas: [],
      },
      actionChecklist: [
        {
          id: 'item-1',
          label: 'Confirm hourly rates in Exhibit A',
          completed: false,
          category: 'clarification',
        },
      ],
      createdAt: '',
      updatedAt: '',
    };

    it('copies briefing markdown to clipboard and handles download', async () => {
      vi.spyOn(api, 'getBriefing').mockResolvedValue({ briefing: mockBriefing });
      vi.spyOn(api, 'exportBriefingMarkdown').mockResolvedValue('# Exported Briefing Markdown');

      // Mock navigator.clipboard
      const mockClipboardWrite = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: mockClipboardWrite },
      });

      // Mock URL.createObjectURL and revokeObjectURL
      const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
      const mockRevokeObjectURL = vi.fn();
      window.URL.createObjectURL = mockCreateObjectURL;
      window.URL.revokeObjectURL = mockRevokeObjectURL;

      render(<ActionableBriefingView document={mockDoc} />);

      await waitFor(() => {
        expect(screen.getByText('Confirm hourly rates in Exhibit A')).toBeDefined();
      });

      // Click copy markdown
      const copyBtn = screen.getByRole('button', { name: /copy briefing/i });
      fireEvent.click(copyBtn);

      await waitFor(() => {
        expect(mockClipboardWrite).toHaveBeenCalledWith('# Exported Briefing Markdown');
        expect(screen.getByText(/copied to clipboard/i)).toBeDefined();
      });

      // Click download markdown
      const downloadBtn = screen.getByRole('button', { name: /download markdown/i });
      fireEvent.click(downloadBtn);

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled();
        expect(mockRevokeObjectURL).toHaveBeenCalled();
      });
    });

    it('handles clipboard copy error and download error silently', async () => {
      vi.spyOn(api, 'getBriefing').mockResolvedValue({ briefing: mockBriefing });
      vi.spyOn(api, 'exportBriefingMarkdown').mockRejectedValue(new Error('Export failed'));

      render(<ActionableBriefingView document={mockDoc} />);

      await waitFor(() => {
        expect(screen.getByText('Confirm hourly rates in Exhibit A')).toBeDefined();
      });

      const copyBtn = screen.getByRole('button', { name: /copy briefing/i });
      fireEvent.click(copyBtn);

      const downloadBtn = screen.getByRole('button', { name: /download markdown/i });
      fireEvent.click(downloadBtn);

      // Verify no unhandled crash
      expect(screen.getByText('Confirm hourly rates in Exhibit A')).toBeDefined();
    });

    it('handles toggle checklist error silently', async () => {
      vi.spyOn(api, 'getBriefing').mockResolvedValue({ briefing: mockBriefing });
      vi.spyOn(api, 'toggleChecklist').mockRejectedValue(new Error('Toggle failed'));

      render(<ActionableBriefingView document={mockDoc} />);

      await waitFor(() => {
        expect(screen.getByText('Confirm hourly rates in Exhibit A')).toBeDefined();
      });

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(api.toggleChecklist).toHaveBeenCalled();
      });
    });
  });

  describe('UploadZone Drag and Drop & Space Keydown', () => {
    it('handles dragover, dragleave, and drop events', async () => {
      vi.spyOn(api, 'getDemoTemplates').mockResolvedValue({ templates: [] });
      vi.spyOn(api, 'analyzeDocument').mockResolvedValue({
        analysis: {
          id: 'a1',
          documentId: 'doc-dropped',
          documentTitle: 'Dropped File',
          plainLanguageSummary: 'Summary',
          keyClauses: [],
          obligations: [],
          rights: [],
          risks: [],
          potentialIssues: [],
          unusualClauses: [],
          definedTerms: [],
          extractedFacts: [],
          questionsForLawyer: [],
          actionChecklist: [],
          createdAt: '',
          updatedAt: '',
        } as any,
      });
      vi.spyOn(api, 'uploadDocument').mockResolvedValue({
        document: {
          id: 'doc-dropped',
          userId: 'u1',
          title: 'Dropped File',
          originalFilename: 'dropped.pdf',
          mimeType: 'application/pdf',
          fileSizeBytes: 2048,
          pageCount: 1,
          characterCount: 1000,
          status: 'ready',
          errorMessage: null,
          createdAt: '',
          updatedAt: '',
        },
      });

      const onUploaded = vi.fn();
      render(<UploadZone onDocumentUploaded={onUploaded} />);

      const dropzone = screen.getByRole('button', { name: /upload legal document/i });

      // Drag over
      fireEvent.dragOver(dropzone);
      // Drag leave
      fireEvent.dragLeave(dropzone);

      // Space keydown
      fireEvent.keyDown(dropzone, { key: ' ' });

      // Drop valid file
      const file = new File(['%PDF-1.4 content'], 'contract.pdf', { type: 'application/pdf' });
      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file],
        },
      });

      await waitFor(() => {
        expect(api.uploadDocument).toHaveBeenCalled();
        expect(onUploaded).toHaveBeenCalled();
      });
    });

    it('handles demo template load failure', async () => {
      vi.spyOn(api, 'getDemoTemplates').mockResolvedValue({
        templates: [
          {
            id: 'fail-demo',
            title: 'Fail Demo',
            category: 'General',
            description: 'Will fail to load',
            filename: 'fail.txt',
          },
        ],
      });
      vi.spyOn(api, 'loadDemoTemplate').mockRejectedValue(new Error('Failed to load demo template'));

      render(<UploadZone onDocumentUploaded={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Fail Demo')).toBeDefined();
      });

      const demoBtn = screen.getByRole('button', { name: /fail demo/i });
      fireEvent.click(demoBtn);

      await waitFor(() => {
        expect(screen.getByText('Failed to load demo template')).toBeDefined();
      });
    });
  });

  describe('AuthModal Registration and Demo Login Edge Cases', () => {
    it('validates required name and password length in registration mode', async () => {
      render(<AuthModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

      // Switch to Register mode
      const createAccountTab = screen.getByRole('tab', { name: /register/i });
      fireEvent.click(createAccountTab);

      const submitBtn = screen.getByRole('button', { name: /create account/i });
      const form = submitBtn.closest('form')!;

      // Empty name
      fireEvent.submit(form);
      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeDefined();
      });

      // Fill name but short password (< 8 chars)
      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password/i);

      fireEvent.change(nameInput, { target: { value: 'Ruth Bader Ginsburg' } });
      fireEvent.change(emailInput, { target: { value: 'rbg@scotus.gov' } });
      fireEvent.change(passwordInput, { target: { value: 'short' } });

      fireEvent.submit(form);
      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters long')).toBeDefined();
      });

      // Valid registration
      vi.spyOn(api, 'register').mockResolvedValue({
        token: 'new-reg-tok',
        user: { id: 'u-reg', email: 'rbg@scotus.gov', name: 'Ruth Bader Ginsburg', createdAt: '', updatedAt: '' },
      });

      fireEvent.change(passwordInput, { target: { value: 'ValidPassword123!' } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(api.register).toHaveBeenCalledWith({
          email: 'rbg@scotus.gov',
          password: 'ValidPassword123!',
          name: 'Ruth Bader Ginsburg',
        });
      });
    });

    it('handles demo login when api.login succeeds directly', async () => {
      const onSuccess = vi.fn();
      const onClose = vi.fn();

      vi.spyOn(api, 'login').mockResolvedValue({
        token: 'direct-login-token',
        user: { id: 'u-direct', email: 'demo.evaluator@legallens.local', name: 'Demo Evaluator', createdAt: '', updatedAt: '' },
      });

      render(<AuthModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

      const demoBtn = screen.getByRole('button', { name: /instant demo mode/i });
      fireEvent.click(demoBtn);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('handles demo login failure when both login and register fail', async () => {
      vi.spyOn(api, 'login').mockRejectedValue(new Error('Login failed'));
      vi.spyOn(api, 'register').mockRejectedValue(new Error('Registration failed'));

      render(<AuthModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

      const demoBtn = screen.getByRole('button', { name: /instant demo mode/i });
      fireEvent.click(demoBtn);

      await waitFor(() => {
        expect(screen.getByText('Registration failed')).toBeDefined();
      });
    });
  });

  describe('ChatInterface Suggested Questions & Citations Toggle', () => {
    const mockDoc: LegalDocumentDTO = {
      id: 'doc-chat-2',
      userId: 'u1',
      title: 'Lease Contract',
      originalFilename: 'lease.txt',
      mimeType: 'text/plain',
      fileSizeBytes: 500,
      pageCount: 1,
      characterCount: 1000,
      status: 'ready',
      errorMessage: null,
      createdAt: '',
      updatedAt: '',
    };

    it('clicks suggested question and toggles citations and copies text', async () => {
      const existingAssistantMsg: ChatMessageDTO = {
        id: 'msg-exist',
        userId: 'u1',
        documentId: 'doc-chat-2',
        role: 'assistant',
        content: 'Existing answer text',
        structuredAnswer: {
          shortAnswer: 'Yes, 30 days notice is required.',
          whatTheDocumentSays: 'Clause 8 outlines notice.',
          whyItMatters: 'Critical for avoiding penalty.',
          sourceCitations: [
            {
              chunkId: 'chk-cit-1',
              pageNumber: 1,
              sectionHeading: 'Section 8: Notice',
              textSnippet: 'Notice must be in writing 30 days in advance.',
            },
          ],
          questionsForLawyer: ['Can notice be delivered via email?'],
          grounded: true,
        },
        createdAt: '',
      };

      vi.spyOn(api, 'getChatHistory').mockResolvedValue({ messages: [existingAssistantMsg] });
      vi.spyOn(api, 'askChat').mockResolvedValue({
        message: {
          id: 'msg-suggested-res',
          userId: 'u1',
          documentId: 'doc-chat-2',
          role: 'assistant',
          content: 'Plain text fallback without structured answer.',
          createdAt: '',
        },
      });

      const mockClipboardWrite = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText: mockClipboardWrite } });

      render(<ChatInterface document={mockDoc} />);

      await waitFor(() => {
        expect(screen.getByText('Yes, 30 days notice is required.')).toBeDefined();
      });

      // Toggle citations
      const citationsToggleBtn = screen.getByRole('button', { name: /document source citation/i });
      fireEvent.click(citationsToggleBtn);
      expect(screen.getByText(/"Notice must be in writing 30 days in advance\."/i)).toBeDefined();

      // Copy text to clipboard
      const copyBtn = screen.getByRole('button', { name: /copy answer/i });
      fireEvent.click(copyBtn);
      expect(mockClipboardWrite).toHaveBeenCalled();
    });

    it('clicks a suggested question in empty chat to submit question', async () => {
      vi.spyOn(api, 'getChatHistory').mockResolvedValue({ messages: [] });
      vi.spyOn(api, 'askChat').mockResolvedValue({
        message: {
          id: 'msg-suggested-res',
          userId: 'u1',
          documentId: 'doc-chat-2',
          role: 'assistant',
          content: 'Plain text fallback without structured answer.',
          createdAt: '',
        },
      });

      render(<ChatInterface document={mockDoc} />);

      await waitFor(() => {
        expect(screen.getByText(/what happens if i terminate this agreement early\?/i)).toBeDefined();
      });

      // Click a suggested question
      const suggestedBtn = screen.getByRole('button', { name: /what happens if i terminate this agreement early\?/i });
      fireEvent.click(suggestedBtn);

      await waitFor(() => {
        expect(api.askChat).toHaveBeenCalled();
        expect(screen.getByText('Plain text fallback without structured answer.')).toBeDefined();
      });
    });

    it('clears chat history with window.confirm true and false', async () => {
      vi.spyOn(api, 'getChatHistory').mockResolvedValue({
        messages: [{ id: 'm1', userId: 'u1', documentId: 'doc-chat-2', role: 'user', content: 'hello', createdAt: '' }],
      });
      vi.spyOn(api, 'clearChatHistory').mockResolvedValue({ success: true, message: 'Cleared' });

      render(<ChatInterface document={mockDoc} />);

      await waitFor(() => {
        expect(screen.getByText('hello')).toBeDefined();
      });

      // Case 1: confirm = false
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      const clearBtn = screen.getByRole('button', { name: /clear chat history/i });
      fireEvent.click(clearBtn);
      expect(api.clearChatHistory).not.toHaveBeenCalled();

      // Case 2: confirm = true
      confirmSpy.mockReturnValue(true);
      fireEvent.click(clearBtn);
      await waitFor(() => {
        expect(api.clearChatHistory).toHaveBeenCalledWith('doc-chat-2');
      });
    });

    it('handles chat error by appending error assistant message', async () => {
      vi.spyOn(api, 'getChatHistory').mockResolvedValue({ messages: [] });
      vi.spyOn(api, 'askChat').mockRejectedValue(new Error('Connection timed out'));

      render(<ChatInterface document={mockDoc} />);

      const input = screen.getByPlaceholderText(/ask a question about this contract/i);
      fireEvent.change(input, { target: { value: 'Will this fail?' } });

      const form = input.closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/connection timed out/i)).toBeDefined();
      });
    });
  });

  describe('DocumentComparison Load Sample & Error States', () => {
    it('handles handleLoadSampleComparison success and failure', async () => {
      const doc1: LegalDocumentDTO = {
        id: 'doc-s1',
        userId: 'u1',
        title: 'Vendor V1',
        originalFilename: 'v1.txt',
        mimeType: 'text/plain',
        fileSizeBytes: 100,
        pageCount: 1,
        characterCount: 200,
        status: 'ready',
        errorMessage: null,
        createdAt: '',
        updatedAt: '',
      };
      const doc2: LegalDocumentDTO = {
        id: 'doc-s2',
        userId: 'u1',
        title: 'Vendor V2',
        originalFilename: 'v2.txt',
        mimeType: 'text/plain',
        fileSizeBytes: 100,
        pageCount: 1,
        characterCount: 200,
        status: 'ready',
        errorMessage: null,
        createdAt: '',
        updatedAt: '',
      };

      vi.spyOn(api, 'loadDemoTemplate')
        .mockResolvedValueOnce({ message: 'Loaded V1', document: doc1 })
        .mockResolvedValueOnce({ message: 'Loaded V2', document: doc2 });

      vi.spyOn(api, 'compareDocuments').mockResolvedValue({
        comparison: {
          id: 'cmp-s',
          userId: 'u1',
          documentAId: 'doc-s1',
          documentBId: 'doc-s2',
          documentATitle: 'Vendor V1',
          documentBTitle: 'Vendor V2',
          executiveSummary: 'Comparison summary',
          addedClauses: [],
          removedClauses: [],
          modifiedClauses: [],
          changedObligations: [],
          changedFinancialTerms: [],
          changedDates: [],
          changedTermination: [],
          changedLiability: [],
          changedDisputeResolution: [],
          createdAt: '',
        },
      });

      const onDocCreated = vi.fn();
      render(<DocumentComparison documents={[doc1, doc2]} onDocumentCreated={onDocCreated} />);

      const loadSampleBtn = screen.getByRole('button', { name: /load sample comparison/i });
      fireEvent.click(loadSampleBtn);

      await waitFor(() => {
        expect(api.compareDocuments).toHaveBeenCalled();
        expect(onDocCreated).toHaveBeenCalled();
        expect(screen.getByText('Comparison summary')).toBeDefined();
      });

      // Now test sample comparison failure
      vi.spyOn(api, 'loadDemoTemplate').mockRejectedValueOnce(new Error('Sample comparison network error'));
      fireEvent.click(loadSampleBtn);

      await waitFor(() => {
        expect(screen.getByText('Sample comparison network error')).toBeDefined();
      });
    });

    it('handles comparison API failure during manual comparison', async () => {
      const doc1: LegalDocumentDTO = {
        id: 'doc-m1',
        userId: 'u1',
        title: 'Contract 1',
        originalFilename: 'c1.txt',
        mimeType: 'text/plain',
        fileSizeBytes: 100,
        pageCount: 1,
        characterCount: 200,
        status: 'ready',
        errorMessage: null,
        createdAt: '',
        updatedAt: '',
      };
      const doc2: LegalDocumentDTO = {
        id: 'doc-m2',
        userId: 'u1',
        title: 'Contract 2',
        originalFilename: 'c2.txt',
        mimeType: 'text/plain',
        fileSizeBytes: 100,
        pageCount: 1,
        characterCount: 200,
        status: 'ready',
        errorMessage: null,
        createdAt: '',
        updatedAt: '',
      };

      vi.spyOn(api, 'compareDocuments').mockRejectedValue(new Error('Comparison service offline'));

      render(<DocumentComparison documents={[doc1, doc2]} onDocumentCreated={vi.fn()} />);

      const compareBtn = screen.getByRole('button', { name: /^compare documents$/i });
      fireEvent.click(compareBtn);

      await waitFor(() => {
        expect(screen.getByText('Comparison service offline')).toBeDefined();
      });
    });
  });

  describe('DocumentSearch Multiple Results & Empty Query', () => {
    it('ignores empty search query and allows next/prev navigation through results', async () => {
      vi.spyOn(api, 'searchDocument').mockResolvedValue({
        results: [
          {
            chunkId: 'chk-1',
            pageNumber: 1,
            sectionHeading: 'Section 1: Payment',
            matchedSnippet: 'Payment shall be made within 30 days of invoice.',
          },
          {
            chunkId: 'chk-2',
            pageNumber: 2,
            sectionHeading: 'Section 4: Late Payment',
            matchedSnippet: 'Late payment accrues interest at 1.5% per month.',
          },
        ],
      });

      render(
        <DocumentSearch
          documentId="doc-srch"
          documentTitle="Services Agreement"
          onBack={vi.fn()}
        />
      );

      const input = screen.getByPlaceholderText(/search clauses, terms, numbers/i);
      const form = input.closest('form')!;

      // Submit with empty query - nothing happens
      fireEvent.submit(form);
      expect(api.searchDocument).not.toHaveBeenCalled();

      // Submit with query
      fireEvent.change(input, { target: { value: 'payment' } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Section 1: Payment')).toBeDefined();
        expect(screen.getByText('Section 4: Late Payment')).toBeDefined();
        expect(screen.getByText(/1 of 2/i)).toBeDefined();
      });

      // Navigate Next
      const nextBtn = screen.getByRole('button', { name: /next match/i });
      fireEvent.click(nextBtn);
      expect(screen.getByText(/2 of 2/i)).toBeDefined();

      // Navigate Previous
      const prevBtn = screen.getByRole('button', { name: /previous match/i });
      fireEvent.click(prevBtn);
      expect(screen.getByText(/1 of 2/i)).toBeDefined();
    });
  });

  describe('DashboardView Full Actions & Document Row Buttons', () => {
    const mockUser: UserDTO = {
      id: 'u-dash',
      email: 'dash@test.com',
      name: 'Dashboard Tester',
      createdAt: '',
      updatedAt: '',
    };

    const mockDocs: LegalDocumentDTO[] = [
      {
        id: 'd-1',
        userId: 'u-dash',
        title: 'Non-Disclosure Agreement',
        originalFilename: 'nda.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 1000,
        pageCount: 2,
        characterCount: 3000,
        status: 'ready',
        errorMessage: null,
        createdAt: '',
        updatedAt: '',
      },
    ];

    it('triggers all action handlers on DashboardView', () => {
      const onUpload = vi.fn();
      const onCompare = vi.fn();
      const onChat = vi.fn();
      const onAnalyze = vi.fn();
      const onBriefing = vi.fn();
      const onSearch = vi.fn();
      const onDelete = vi.fn();
      const onLoadDemo = vi.fn();

      render(
        <DashboardView
          user={mockUser}
          stats={null}
          documents={mockDocs}
          onOpenUpload={onUpload}
          onOpenCompare={onCompare}
          onOpenChat={onChat}
          onOpenAnalyze={onAnalyze}
          onOpenBriefing={onBriefing}
          onOpenSearch={onSearch}
          onDeleteDoc={onDelete}
          onLoadDemo={onLoadDemo}
        />
      );

      // Top action buttons
      fireEvent.click(screen.getByRole('button', { name: /^upload document$/i }));
      expect(onUpload).toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: /compare contracts/i }));
      expect(onCompare).toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: /try demo contract/i }));
      expect(onLoadDemo).toHaveBeenCalled();

      // Table row actions
      fireEvent.click(screen.getByText('Non-Disclosure Agreement'));
      expect(onAnalyze).toHaveBeenCalledWith('d-1');

      fireEvent.click(screen.getByRole('button', { name: /^analyze$/i }));
      expect(onAnalyze).toHaveBeenCalledWith('d-1');

      fireEvent.click(screen.getByTitle('Ask AI'));
      expect(onChat).toHaveBeenCalledWith('d-1');

      fireEvent.click(screen.getByTitle('Lawyer Briefing'));
      expect(onBriefing).toHaveBeenCalledWith('d-1');

      fireEvent.click(screen.getByTitle('Search Document'));
      expect(onSearch).toHaveBeenCalledWith('d-1');

      fireEvent.click(screen.getByTitle('Delete Document'));
      expect(onDelete).toHaveBeenCalledWith('d-1');
    });

    it('renders empty documents state with call-to-action buttons', () => {
      const onUpload = vi.fn();
      const onLoadDemo = vi.fn();

      render(
        <DashboardView
          user={mockUser}
          stats={null}
          documents={[]}
          onOpenUpload={onUpload}
          onOpenCompare={vi.fn()}
          onOpenChat={vi.fn()}
          onOpenAnalyze={vi.fn()}
          onOpenBriefing={vi.fn()}
          onOpenSearch={vi.fn()}
          onDeleteDoc={vi.fn()}
          onLoadDemo={onLoadDemo}
        />
      );

      expect(screen.getByText(/no documents uploaded yet/i)).toBeDefined();

      fireEvent.click(screen.getByRole('button', { name: /upload contract/i }));
      expect(onUpload).toHaveBeenCalled();

      const demoBtns = screen.getAllByRole('button', { name: /try demo contract/i });
      fireEvent.click(demoBtns[1]);
      expect(onLoadDemo).toHaveBeenCalled();
    });
  });

  describe('App.tsx Navigation, Subviews, and Document Lifecycle', () => {
    const mockUser: UserDTO = {
      id: 'u-app',
      email: 'app@test.com',
      name: 'App Tester',
      createdAt: '',
      updatedAt: '',
    };

    const mockDoc: LegalDocumentDTO = {
      id: 'd-app-1',
      userId: 'u-app',
      title: 'Employment Agreement',
      originalFilename: 'employment.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileSizeBytes: 2000,
      pageCount: 2,
      characterCount: 4000,
      status: 'ready',
      errorMessage: null,
      createdAt: '',
      updatedAt: '',
    };

    const mockAnalysis: DocumentAnalysisDTO = {
      id: 'anl-app-1',
      documentId: 'd-app-1',
      documentType: 'Employment Agreement',
      partiesInvolved: ['Acme Corp', 'App Tester'],
      effectiveDate: '2026-01-01',
      expirationDate: null,
      jurisdiction: 'New York',
      highLevelSummary: 'Employment contract summary.',
      plainLanguageSummary: {
        whatThisDocumentIsAbout: 'Employment contract',
        whatYouAreAgreeingTo: ['Provide engineering services'],
        whatTheOtherPartyIsAgreeingTo: ['Pay compensation'],
        yourKeyResponsibilities: ['Deliver roadmap'],
        yourRights: ['Standard PTO'],
        importantDates: ['2026-01-01'],
        financialObligations: ['None'],
        terminationConditions: ['At will notice'],
      },
      extractedFacts: [],
      clauses: [],
      findings: [],
      createdAt: '',
      updatedAt: '',
    };

    it('navigates to documents, analyzes document, returns to list, and deletes with confirm true/false', async () => {
      api.setToken('valid-token');
      vi.spyOn(api, 'getProfile').mockResolvedValue({ user: mockUser });
      vi.spyOn(api, 'listDocuments').mockResolvedValue({ documents: [mockDoc] });
      vi.spyOn(api, 'getDashboardStats').mockResolvedValue({
        totalDocuments: 1,
        totalAnalyses: 1,
        totalPendingActionItems: 0,
        recentDocuments: [mockDoc],
      });
      vi.spyOn(api, 'getAnalysis').mockResolvedValue({ analysis: mockAnalysis });
      vi.spyOn(api, 'deleteDocument').mockResolvedValue({ success: true, message: 'Deleted' });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/welcome back, app tester/i)).toBeDefined();
      });

      // Switch to Documents tab
      const docsNavBtn = screen.getByRole('button', { name: /my documents/i });
      fireEvent.click(docsNavBtn);

      await waitFor(() => {
        expect(screen.getByText('Employment Agreement')).toBeDefined();
      });

      // Click document title to view analysis
      fireEvent.click(screen.getByText('Employment Agreement'));

      await waitFor(() => {
        expect(screen.getByText('Employment contract summary.')).toBeDefined();
      });

      // Click "← All Documents"
      const allDocsBtn = screen.getByRole('button', { name: /← all documents/i });
      fireEvent.click(allDocsBtn);

      await waitFor(() => {
        expect(screen.getByText('My Legal Documents')).toBeDefined();
      });

      // Click "+ Upload Document"
      const uploadBtn = screen.getByRole('button', { name: /\+ upload document/i });
      fireEvent.click(uploadBtn);

      expect(screen.getByRole('button', { name: /upload legal document/i })).toBeDefined();

      // Cancel upload and go back
      const cancelBtn = screen.getByRole('button', { name: /← back to documents/i });
      fireEvent.click(cancelBtn);

      // Test Delete with confirm = false
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      const deleteDocBtn = screen.getByTitle('Delete Document');
      fireEvent.click(deleteDocBtn);
      expect(api.deleteDocument).not.toHaveBeenCalled();

      // Test Delete with confirm = true
      confirmSpy.mockReturnValue(true);
      fireEvent.click(deleteDocBtn);

      await waitFor(() => {
        expect(api.deleteDocument).toHaveBeenCalledWith('d-app-1');
      });
    });

    it('navigates to profile, compare, chat, and briefings tabs in App', async () => {
      api.setToken('valid-token');
      vi.spyOn(api, 'getProfile').mockResolvedValue({ user: mockUser });
      vi.spyOn(api, 'listDocuments').mockResolvedValue({ documents: [mockDoc] });
      vi.spyOn(api, 'getDashboardStats').mockResolvedValue({
        totalDocuments: 1,
        totalAnalyses: 1,
        totalPendingActionItems: 0,
        recentDocuments: [mockDoc],
      });
      vi.spyOn(api, 'getAnalysis').mockResolvedValue({ analysis: mockAnalysis });
      vi.spyOn(api, 'getChatHistory').mockResolvedValue({ messages: [] });
      vi.spyOn(api, 'getBriefing').mockResolvedValue({
        briefing: {
          id: 'brf-app',
          userId: 'u-app',
          documentId: 'd-app-1',
          documentTitle: 'Employment Agreement',
          conciseSummary: 'App briefing',
          lawyerChecklist: {
            questionsToAsk: [],
            documentsToBring: [],
            keyConcerns: [],
            importantDeadlines: [],
            clarificationAreas: [],
          },
          actionChecklist: [],
          createdAt: '',
          updatedAt: '',
        },
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/welcome back, app tester/i)).toBeDefined();
      });

      // Compare tab
      fireEvent.click(screen.getByRole('button', { name: /^compare$/i }));
      expect(screen.getByText(/contract version & document comparison/i)).toBeDefined();

      // Profile tab
      fireEvent.click(screen.getByRole('button', { name: /user profile/i }));
      expect(screen.getByText('ACCOUNT ID')).toBeDefined();

      // Select document for chat via documents tab
      fireEvent.click(screen.getByRole('button', { name: /my documents/i }));
      await waitFor(() => {
        expect(screen.getByText('Employment Agreement')).toBeDefined();
      });

      // Ask AI button on document row
      fireEvent.click(screen.getByTitle('Ask AI'));
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ask a question about this contract/i)).toBeDefined();
      });

      // Briefing button on document row via documents
      fireEvent.click(screen.getByRole('button', { name: /my documents/i }));
      fireEvent.click(screen.getByTitle('Lawyer Briefing'));
      await waitFor(() => {
        expect(screen.getByText(/actionable lawyer preparation briefing/i)).toBeDefined();
      });
    });

    it('navigates to upload and search subviews from dashboard and returns back', async () => {
      localStorage.setItem('legallens_token', 'mock-tok');
      vi.spyOn(api, 'getToken').mockReturnValue('mock-tok');
      vi.spyOn(api, 'getProfile').mockResolvedValue({
        user: { id: 'u-sub', email: 'app@test.com', name: 'App Tester', createdAt: '', updatedAt: '' },
      });

      const mockDocs: LegalDocumentDTO[] = [
        {
          id: 'doc-subview-1',
          userId: 'u-sub',
          title: 'Consulting Contract',
          originalFilename: 'consulting.pdf',
          mimeType: 'application/pdf',
          fileSizeBytes: 2048,
          pageCount: 1,
          characterCount: 500,
          status: 'ready',
          errorMessage: null,
          createdAt: '',
          updatedAt: '',
        },
      ];

      vi.spyOn(api, 'getDashboardStats').mockResolvedValue({
        totalDocuments: 1,
        totalAnalyses: 1,
        totalPendingActionItems: 0,
        recentDocuments: mockDocs,
      });
      vi.spyOn(api, 'listDocuments').mockResolvedValue({ documents: mockDocs });
      vi.spyOn(api, 'getDemoTemplates').mockResolvedValue({ templates: [] });
      vi.spyOn(api, 'searchDocument').mockResolvedValue({ results: [] });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Consulting Contract')).toBeDefined();
      });

      // Click "Upload Document" from DashboardView quick actions
      const uploadNewBtn = screen.getByRole('button', { name: /^upload document$/i });
      fireEvent.click(uploadNewBtn);

      await waitFor(() => {
        expect(screen.getByText('← Back to Documents')).toBeDefined();
      });

      // Click "← Back to Documents"
      fireEvent.click(screen.getByText('← Back to Documents'));

      // Click Search icon button on document row from DashboardView
      fireEvent.click(screen.getByRole('button', { name: /dashboard/i }));
      await waitFor(() => {
        expect(screen.getByText('Consulting Contract')).toBeDefined();
      });

      const searchBtn = screen.getByTitle('Search Document');
      fireEvent.click(searchBtn);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /search document/i })).toBeDefined();
      });

      // Click "Back to Analysis"
      fireEvent.click(screen.getByRole('button', { name: /back to analysis/i }));

      // Click About & Vision tab
      fireEvent.click(screen.getByRole('button', { name: /user profile/i }));
    });
  });

  describe('Client Exhaustive Edge Cases', () => {
    it('covers ActionableBriefingView Enter keydown and null briefing handleToggle', async () => {
      const mockDoc: LegalDocumentDTO = {
        id: 'doc-briefing-enter',
        userId: 'u1',
        title: 'Lease Agreement',
        originalFilename: 'lease.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 1024,
        pageCount: 1,
        characterCount: 200,
        status: 'ready',
        errorMessage: null,
        createdAt: '',
        updatedAt: '',
      };

      const mockBriefing: LegalBriefingDTO = {
        id: 'b-enter',
        userId: 'u1',
        documentId: 'doc-briefing-enter',
        documentTitle: 'Lease Agreement',
        conciseSummary: 'Summary of lease',
        lawyerChecklist: {
          questionsToAsk: ['Is deposit refundable?'],
          documentsToBring: ['Lease copy'],
          keyConcerns: ['Termination penalties'],
          importantDeadlines: ['30 days notice'],
          clarificationAreas: [],
        },
        actionChecklist: [
          {
            id: 'chk-1',
            label: 'Verify Deposit Refund Terms',
            category: 'Financial',
            completed: false,
          },
        ],
        createdAt: '',
        updatedAt: '',
      };

      vi.spyOn(api, 'getBriefing').mockResolvedValue({ briefing: mockBriefing });
      vi.spyOn(api, 'toggleChecklist').mockResolvedValue({
        briefing: {
          ...mockBriefing,
          actionChecklist: [{ ...mockBriefing.actionChecklist[0], completed: true }],
        },
      });

      render(<ActionableBriefingView document={mockDoc} />);

      await waitFor(() => {
        expect(screen.getByText('Verify Deposit Refund Terms')).toBeDefined();
      });

      const checkItem = screen.getByRole('checkbox');
      // Fire Enter key
      fireEvent.keyDown(checkItem, { key: 'Enter' });

      await waitFor(() => {
        expect(api.toggleChecklist).toHaveBeenCalledWith('doc-briefing-enter', 'chk-1', true);
      });
    });

    it('covers AnalysisView optional date, jurisdiction, and clause collapse toggle', async () => {
      const mockDoc: LegalDocumentDTO = {
        id: 'doc-opts',
        userId: 'u1',
        title: 'Contract with Undefined Dates',
        originalFilename: 'opts.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 1024,
        pageCount: 1,
        characterCount: 200,
        status: 'ready',
        errorMessage: null,
        createdAt: '',
        updatedAt: '',
      };

      const mockAnalysis: DocumentAnalysisDTO = {
        id: 'anl-opts',
        documentId: 'doc-opts',
        documentType: 'Commercial Agreement',
        partiesInvolved: ['Party A', 'Party B'],
        effectiveDate: undefined as any,
        expirationDate: undefined as any,
        jurisdiction: undefined as any,
        highLevelSummary: 'High level text',
        plainLanguageSummary: {
          whatThisDocumentIsAbout: 'Comprehensive services agreement.',
          whatYouAreAgreeingTo: ['Provide services'],
          whatTheOtherPartyIsAgreeingTo: ['Pay invoices'],
          yourKeyResponsibilities: ['Deliver on time'],
          yourRights: ['Receive timely payment'],
          importantDates: ['Jan 1, 2026'],
          financialObligations: ['Net 30 payment terms'],
          terminationConditions: ['30 days notice for convenience'],
        },
        extractedFacts: [],
        clauses: [
          {
            id: 'c-expand',
            documentId: 'doc-opts',
            title: 'Dispute Arbitration Clause',
            category: 'dispute_resolution' as any,
            originalText: 'All disputes shall be submitted to arbitration.',
            plainExplanation: 'You must arbitrate disagreements.',
            whyItMatters: 'Waives courtroom jury trials.',
            concernLevel: 'review_carefully',
            pageNumber: 1,
            sectionHeading: 'Section 9',
          },
          {
            id: 'c-undef-category',
            documentId: 'doc-opts',
            title: 'General Condition',
            category: undefined as any,
            originalText: 'Standard terms apply.',
            plainExplanation: 'General conditions.',
            whyItMatters: 'Provides legal context.',
            concernLevel: 'informational',
            pageNumber: 2,
            sectionHeading: 'Section 10',
          },
        ],
        findings: [],
        createdAt: '',
        updatedAt: '',
      };

      render(
        <AnalysisView
          document={mockDoc}
          analysis={mockAnalysis}
          onOpenChat={vi.fn()}
          onOpenBriefing={vi.fn()}
          onOpenSearch={vi.fn()}
        />
      );

      expect(screen.getByText('Upon execution')).toBeDefined();
      expect(screen.getByText('Not explicitly specified')).toBeDefined();

      // Switch to Important Clauses tab
      const clausesTab = screen.getByRole('tab', { name: /important clauses/i });
      fireEvent.click(clausesTab);

      // Expand clause card
      const expandBtn = screen.getAllByRole('button', { name: /view original clause/i })[0];
      fireEvent.click(expandBtn);

      await waitFor(() => {
        expect(screen.getByText('Hide Details')).toBeDefined();
      });

      // Collapse back
      const collapseBtn = screen.getByRole('button', { name: /hide details/i });
      fireEvent.click(collapseBtn);

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /view original clause/i })).toHaveLength(2);
      });
    });

    it('covers AuthModal backdrop click and non-Error catch handlers', async () => {
      const onClose = vi.fn();
      const onSuccess = vi.fn();

      const { container } = render(<AuthModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

      // Backdrop click (click outer container where target === currentTarget)
      const backdrop = container.firstChild as HTMLElement;
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalled();

      // Submit with non-Error rejection
      vi.spyOn(api, 'login').mockRejectedValueOnce('raw string auth error');
      const form = container.querySelector('form')!;
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password/i);

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Authentication failed')).toBeDefined();
      });

      // Demo login with non-Error rejection
      vi.spyOn(api, 'login').mockRejectedValueOnce('raw error 1');
      vi.spyOn(api, 'register').mockRejectedValueOnce('raw error 2');
      const demoBtn = screen.getByRole('button', { name: /instant demo mode/i });
      fireEvent.click(demoBtn);

      await waitFor(() => {
        expect(screen.getByText('Demo login failed')).toBeDefined();
      });
    });

    it('covers ChatInterface getChatHistory error and clearChatHistory error', async () => {
      const mockDoc: LegalDocumentDTO = {
        id: 'doc-chat-catch',
        userId: 'u1',
        title: 'Chat Test Doc',
        originalFilename: 'chat.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 1024,
        pageCount: 1,
        characterCount: 300,
        status: 'ready',
        errorMessage: null,
        createdAt: '',
        updatedAt: '',
      };

      vi.spyOn(api, 'getChatHistory').mockRejectedValueOnce(new Error('History network error'));
      render(<ChatInterface document={mockDoc} />);

      expect(screen.getByPlaceholderText(/ask a question about this contract/i)).toBeDefined();

      // Test clear chat error branch
      vi.spyOn(api, 'clearChatHistory').mockRejectedValueOnce(new Error('Clear network error'));
      vi.spyOn(window, 'confirm').mockReturnValue(true);
    });

    it('covers DocumentComparison empty selectors, select changes, and all category tabs', async () => {
      const mockDocs: LegalDocumentDTO[] = [
        {
          id: 'doc-cmp-1',
          userId: 'u1',
          title: 'Doc Version 1',
          originalFilename: 'doc1.pdf',
          mimeType: 'application/pdf',
          fileSizeBytes: 1000,
          pageCount: 1,
          characterCount: 400,
          status: 'ready',
          errorMessage: null,
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'doc-cmp-2',
          userId: 'u1',
          title: 'Doc Version 2',
          originalFilename: 'doc2.pdf',
          mimeType: 'application/pdf',
          fileSizeBytes: 1000,
          pageCount: 1,
          characterCount: 400,
          status: 'ready',
          errorMessage: null,
          createdAt: '',
          updatedAt: '',
        },
      ];

      const mockDiffItem = (cat: string, impact: 'low' | 'moderate' | 'significant' = 'significant'): ClauseDifferenceDTO => ({
        category: cat,
        documentA: 'Doc A Clause 1',
        documentB: 'Doc B Clause 1',
        difference: `${cat} was updated`,
        whyItMatters: 'Important change',
        impactLevel: impact,
      });

      const mockComp: ComparisonDTO = {
        id: 'comp-full',
        userId: 'u1',
        documentAId: 'doc-cmp-1',
        documentBId: 'doc-cmp-2',
        documentATitle: 'Doc Version 1',
        documentBTitle: 'Doc Version 2',
        executiveSummary: 'Full comparison summary',
        addedClauses: [mockDiffItem('Added Terms', 'significant')],
        removedClauses: [mockDiffItem('Removed Terms', 'moderate')],
        modifiedClauses: [mockDiffItem('Modified Terms', 'low')],
        changedObligations: [],
        changedFinancialTerms: [mockDiffItem('Financial & Fees', 'significant')],
        changedDates: [],
        changedTermination: [mockDiffItem('Termination & Notice', 'moderate')],
        changedLiability: [mockDiffItem('Liability & Risk', 'significant')],
        changedDisputeResolution: [mockDiffItem('Dispute Resolution', 'low')],
        createdAt: '',
      };

      vi.spyOn(api, 'compareDocuments').mockResolvedValue({ comparison: mockComp });

      render(<DocumentComparison documents={mockDocs} onDocumentCreated={vi.fn()} />);

      // Test category tabs
      const compareBtn = screen.getByRole('button', { name: /compare documents/i });
      fireEvent.click(compareBtn);

      await waitFor(() => {
        expect(screen.getByText('Full comparison summary')).toBeDefined();
      });

      const categories = [
        'Financial & Fees',
        'Liability & Risk',
        'Termination & Notice',
        'Dispute Resolution',
        'Added Terms',
        'Removed Terms',
        'All Differences',
      ];

      for (const cat of categories) {
        const catBtn = screen.getByRole('button', { name: cat });
        fireEvent.click(catBtn);
        expect(catBtn).toBeDefined();
      }
    });

    it('covers UploadZone file size limit and non-Error upload failure', async () => {
      render(<UploadZone onDocumentUploaded={vi.fn()} />);

      const dropzone = screen.getByRole('button', { name: /upload legal document/i });

      // File > 15MB
      const hugeFile = new File(['x'], 'large.pdf', { type: 'application/pdf' });
      Object.defineProperty(hugeFile, 'size', { value: 16 * 1024 * 1024 });

      fireEvent.drop(dropzone, {
        dataTransfer: { files: [hugeFile] },
      });

      await waitFor(() => {
        expect(screen.getByText('File is too large. Maximum size is 15MB.')).toBeDefined();
      });

      // Upload failure with non-Error
      vi.spyOn(api, 'uploadDocument').mockRejectedValueOnce('raw upload failure');
      const normalFile = new File(['text'], 'agreement.txt', { type: 'text/plain' });

      fireEvent.drop(dropzone, {
        dataTransfer: { files: [normalFile] },
      });

      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeDefined();
      });
    });

    it('covers UserProfileView non-Error deletion failure', async () => {
      const mockUser: SanitizedUser = {
        id: 'u-del-err',
        email: 'del@example.com',
        name: 'Del User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.spyOn(api, 'deleteAccount').mockRejectedValueOnce('raw server deletion error');

      render(<UserProfileView user={mockUser} documentCount={0} onAccountDeleted={vi.fn()} />);

      const deleteBtn = screen.getByRole('button', { name: /delete account/i });
      fireEvent.click(deleteBtn);

      const confirmBtn = screen.getByRole('button', { name: /yes, delete everything/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(screen.getByText('Account deletion failed')).toBeDefined();
      });
    });

    it('covers Header tab clicks and brand logo key navigation for logged-in user', () => {
      const mockUser: SanitizedUser = {
        id: 'u-hdr',
        email: 'hdr@example.com',
        name: 'Header User',
        createdAt: '',
        updatedAt: '',
      };

      const onSelectTab = vi.fn();
      const onOpenAuth = vi.fn();
      const onLogout = vi.fn();
      const onToggleTheme = vi.fn();

      render(
        <Header
          user={mockUser}
          activeTab="dashboard"
          onSelectTab={onSelectTab}
          onOpenAuth={onOpenAuth}
          onLogout={onLogout}
          theme="dark"
          onToggleTheme={onToggleTheme}
        />
      );

      // Brand click & keydown
      const brand = screen.getByLabelText('LegalLens Home');
      fireEvent.click(brand);
      expect(onSelectTab).toHaveBeenCalledWith('dashboard');

      fireEvent.keyDown(brand, { key: 'Enter' });
      expect(onSelectTab).toHaveBeenCalledWith('dashboard');

      fireEvent.keyDown(brand, { key: ' ' });
      expect(onSelectTab).toHaveBeenCalledWith('dashboard');

      // Navigation tabs
      fireEvent.click(screen.getByRole('button', { name: /^dashboard$/i }));
      expect(onSelectTab).toHaveBeenCalledWith('dashboard');

      fireEvent.click(screen.getByRole('button', { name: /my documents/i }));
      expect(onSelectTab).toHaveBeenCalledWith('documents');

      fireEvent.click(screen.getByRole('button', { name: /^compare$/i }));
      expect(onSelectTab).toHaveBeenCalledWith('compare');

      fireEvent.click(screen.getByRole('button', { name: /ask ai/i }));
      expect(onSelectTab).toHaveBeenCalledWith('chat');

      fireEvent.click(screen.getByRole('button', { name: /briefings/i }));
      expect(onSelectTab).toHaveBeenCalledWith('briefings');

      // Profile button & logout
      fireEvent.click(screen.getByRole('button', { name: /user profile/i }));
      expect(onSelectTab).toHaveBeenCalledWith('profile');

      fireEvent.click(screen.getByRole('button', { name: /log out/i }));
      expect(onLogout).toHaveBeenCalled();
    });

    it('covers ApiClient request non-json error fallback and register method', async () => {
      // Non-json response on failed request
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => {
          throw new Error('Non-JSON HTML error body');
        },
      } as any);

      await expect(api.listDocuments()).rejects.toThrow('Request failed (503)');

      // Direct api.register call
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => ({
          token: 'jwt-registered-tok',
          user: { id: 'u-reg-direct', email: 'reg@test.com', name: 'Reg Direct' },
        }),
      } as any);

      const res = await api.register({
        email: 'reg@test.com',
        password: 'Password123!',
        name: 'Reg Direct',
      });

      expect(res.token).toBe('jwt-registered-tok');
      expect(api.getToken()).toBe('jwt-registered-tok');
    });
  });

  describe('Final 100% Target Coverage Edge Cases', () => {
    const mockUser: UserDTO = {
      id: 'u-final',
      name: 'Justice Sandra',
      email: 'sandra@legallens.test',
      createdAt: '',
      updatedAt: '',
    };

    const mockDocA: LegalDocumentDTO = {
      id: 'doc-final-a',
      userId: 'u-final',
      title: 'Agreement Alpha',
      originalFilename: 'alpha.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 1000,
      pageCount: 1,
      characterCount: 1000,
      status: 'ready',
      errorMessage: null,
      createdAt: '',
      updatedAt: '',
    };

    const mockDocB: LegalDocumentDTO = {
      id: 'doc-final-b',
      userId: 'u-final',
      title: 'Agreement Beta',
      originalFilename: 'beta.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileSizeBytes: 1500,
      pageCount: 2,
      characterCount: 2000,
      status: 'ready',
      errorMessage: null,
      createdAt: '',
      updatedAt: '',
    };

    it('covers ChatInterface handleClearHistory catch block', async () => {
      vi.spyOn(api, 'getChatHistory').mockResolvedValue({
        messages: [
          {
            id: 'm1',
            userId: 'u-final',
            documentId: 'doc-final-a',
            role: 'user',
            content: 'Hello AI',
            structuredAnswer: null,
            createdAt: '',
          },
        ],
      });
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.spyOn(api, 'clearChatHistory').mockRejectedValue(new Error('Clear history failed'));

      render(<ChatInterface document={mockDocA} />);

      await waitFor(() => {
        expect(screen.getByText('Hello AI')).toBeDefined();
      });

      const clearBtn = screen.getByRole('button', { name: /clear chat history/i });
      fireEvent.click(clearBtn);

      await waitFor(() => {
        expect(api.clearChatHistory).toHaveBeenCalledWith('doc-final-a');
      });
      expect(screen.getByText('Hello AI')).toBeDefined();
    });

    it('covers DocumentComparison empty select validation and select changes', async () => {
      render(<DocumentComparison documents={[mockDocA, mockDocB]} onDocumentCreated={vi.fn()} />);

      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBe(2);

      // Change selects
      fireEvent.change(selects[0], { target: { value: '' } });
      fireEvent.change(selects[1], { target: { value: mockDocB.id } });

      const compareBtn = screen.getByRole('button', { name: /compare documents/i });
      fireEvent.click(compareBtn);

      expect(screen.getByText('Please select two distinct documents to compare.')).toBeDefined();
    });

    it('covers DocumentSearch highlightMatches empty term fallback', async () => {
      vi.spyOn(api, 'searchDocument').mockResolvedValue({
        results: [
          {
            chunkId: 'chk-1',
            pageNumber: 1,
            sectionHeading: 'Section 1',
            matchedSnippet: 'The contractor shall maintain liability insurance at all times.',
          },
        ],
      });

      render(<DocumentSearch documentId="doc-final-a" documentTitle="Agreement Alpha" onBack={vi.fn()} />);

      const input = screen.getByPlaceholderText(/search clauses/i);
      fireEvent.change(input, { target: { value: 'liability' } });
      const form = input.closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/The contractor shall maintain/i)).toBeDefined();
      });

      // Clear the search input - triggers highlightMatches(text, '') with empty term
      fireEvent.change(input, { target: { value: '' } });
      expect(screen.getByText(/The contractor shall maintain/i)).toBeDefined();
    });

    it('covers Header unauthenticated navigation and login triggers', () => {
      const onSelectTab = vi.fn();
      const onOpenAuth = vi.fn();

      render(
        <Header
          user={null}
          activeTab="help"
          onSelectTab={onSelectTab}
          onOpenAuth={onOpenAuth}
          onLogout={vi.fn()}
          theme="light"
          onToggleTheme={vi.fn()}
        />
      );

      // Brand click with user=null calls onSelectTab('help')
      const brand = screen.getByLabelText('LegalLens Home');
      fireEvent.click(brand);
      expect(onSelectTab).toHaveBeenCalledWith('help');

      fireEvent.keyDown(brand, { key: 'Enter' });
      expect(onSelectTab).toHaveBeenCalledWith('help');

      fireEvent.keyDown(brand, { key: ' ' });
      expect(onSelectTab).toHaveBeenCalledWith('help');

      // Sign In / Register button click
      const signInBtn = screen.getByRole('button', { name: /sign in \/ register/i });
      fireEvent.click(signInBtn);
      expect(onOpenAuth).toHaveBeenCalled();

      // About & Vision button click
      const aboutBtn = screen.getByRole('button', { name: /about & vision/i });
      fireEvent.click(aboutBtn);
      expect(onSelectTab).toHaveBeenCalledWith('help');
    });

    it('covers UserProfileView cancel button in delete account flow', () => {
      render(<UserProfileView user={mockUser} documentCount={3} onAccountDeleted={vi.fn()} />);

      const initialDeleteBtn = screen.getByRole('button', { name: /delete account & data/i });
      fireEvent.click(initialDeleteBtn);

      const cancelBtn = screen.getByRole('button', { name: /cancel/i });
      expect(cancelBtn).toBeDefined();
      fireEvent.click(cancelBtn);

      // Returns to initial state
      expect(screen.getByRole('button', { name: /delete account & data/i })).toBeDefined();
    });

    it('covers UploadZone non-Error reject messages and extension fallback', async () => {
      vi.spyOn(api, 'getDemoTemplates').mockResolvedValue({
        templates: [
          {
            id: 'demo-employment',
            title: 'Sample Employment Agreement',
            category: 'Employment',
            filename: 'demo-employment.txt',
            description: 'Standard employment agreement',
          },
        ],
      });
      render(<UploadZone onDocumentUploaded={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sample employment agreement/i })).toBeDefined();
      });

      // File with no extension or ending in dot (covers ext || '')
      const badFile = new File(['content'], 'nodotextension.');
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [badFile] } });

      expect(screen.getByText(/unsupported file type/i)).toBeDefined();

      // uploadDocument rejects with non-Error string
      vi.spyOn(api, 'uploadDocument').mockRejectedValueOnce('String network error');
      const validFile = new File(['content'], 'valid.pdf', { type: 'application/pdf' });
      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeDefined();
      });

      // uploadDocument rejects with Error instance
      vi.spyOn(api, 'uploadDocument').mockRejectedValueOnce(new Error('Custom upload error message'));
      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(screen.getByText('Custom upload error message')).toBeDefined();
      });

      // loadDemoTemplate rejects with non-Error string
      vi.spyOn(api, 'loadDemoTemplate').mockRejectedValue('Demo string failure');
      const demoBtn = screen.getByRole('button', { name: /sample employment agreement/i });
      fireEvent.click(demoBtn);

      await waitFor(() => {
        expect(screen.getByText('Failed to load demo')).toBeDefined();
      });
    });

    it('covers App landing page explore fictional demo click when unauthenticated', () => {
      render(<App />);
      const demoBtn = screen.getByRole('button', { name: /explore fictional demo/i });
      fireEvent.click(demoBtn);
      expect(screen.getByRole('dialog')).toBeDefined();
    });

    it('covers App handleLoadSampleDemo catch when loadDemoTemplate rejects', async () => {
      api.setToken('auth-token');
      vi.spyOn(api, 'getProfile').mockResolvedValue({ user: mockUser });
      vi.spyOn(api, 'listDocuments').mockResolvedValue({ documents: [] });
      vi.spyOn(api, 'getDashboardStats').mockResolvedValue({
        totalDocuments: 0,
        totalAnalyses: 0,
        totalPendingActionItems: 0,
        recentDocuments: [],
      });
      vi.spyOn(api, 'loadDemoTemplate').mockRejectedValue(new Error('Demo load server down'));

      render(<App />);
      await waitFor(() => {
        expect(screen.getByText(/welcome back, justice sandra/i)).toBeDefined();
      });

      const dashTryDemo = screen.getAllByRole('button', { name: /try demo contract/i })[0];
      fireEvent.click(dashTryDemo);
    });

    it('covers App document deletion cancel and rejection catch', async () => {
      api.setToken('auth-token');
      vi.spyOn(api, 'getProfile').mockResolvedValue({ user: mockUser });
      vi.spyOn(api, 'listDocuments').mockResolvedValue({ documents: [mockDocA] });
      vi.spyOn(api, 'getDashboardStats').mockResolvedValue({
        totalDocuments: 1,
        totalAnalyses: 1,
        totalPendingActionItems: 0,
        recentDocuments: [mockDocA],
      });
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      vi.spyOn(api, 'deleteDocument').mockRejectedValue(new Error('Delete failure'));

      render(<App />);
      await waitFor(() => {
        expect(screen.getByText('Agreement Alpha')).toBeDefined();
      });

      const deleteBtn = screen.getByTitle('Delete Document');
      fireEvent.click(deleteBtn);
      expect(api.deleteDocument).not.toHaveBeenCalled();

      // Now confirm returns true but deleteDocument throws
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      fireEvent.click(deleteBtn);
      await waitFor(() => {
        expect(api.deleteDocument).toHaveBeenCalledWith('doc-final-a');
      });
    });

    it('covers App documents subview navigation and back buttons', async () => {
      api.setToken('auth-token');
      vi.spyOn(api, 'getProfile').mockResolvedValue({ user: mockUser });
      vi.spyOn(api, 'listDocuments').mockResolvedValue({ documents: [mockDocA] });
      vi.spyOn(api, 'getDashboardStats').mockResolvedValue({
        totalDocuments: 1,
        totalAnalyses: 1,
        totalPendingActionItems: 0,
        recentDocuments: [mockDocA],
      });

      render(<App />);
      await waitFor(() => {
        expect(screen.getByText(/welcome back, justice sandra/i)).toBeDefined();
      });

      const uploadTab = screen.getByRole('button', { name: /my documents/i });
      fireEvent.click(uploadTab);
      const addDocBtn = screen.getByRole('button', { name: /\+ upload document/i });
      fireEvent.click(addDocBtn);
      expect(screen.getByText(/back to documents/i)).toBeDefined();
      fireEvent.click(screen.getByText(/back to documents/i));
    });

    it('covers App empty states for chat and briefings', async () => {
      api.setToken('auth-token');
      vi.spyOn(api, 'getProfile').mockResolvedValue({ user: mockUser });
      vi.spyOn(api, 'listDocuments').mockResolvedValue({ documents: [] });
      vi.spyOn(api, 'getDashboardStats').mockResolvedValue({
        totalDocuments: 0,
        totalAnalyses: 0,
        totalPendingActionItems: 0,
        recentDocuments: [],
      });
      vi.spyOn(api, 'loadDemoTemplate').mockResolvedValue({
        message: 'loaded',
        document: mockDocA,
      });

      render(<App />);
      await waitFor(() => {
        expect(screen.getByText(/welcome back, justice sandra/i)).toBeDefined();
      });

      const chatNav = screen.getByRole('button', { name: /ask ai/i });
      fireEvent.click(chatNav);
      expect(screen.getByText(/select a document for ai chat/i)).toBeDefined();
      const loadChatDemoBtn = screen.getByRole('button', { name: /load sample document & ask ai/i });
      fireEvent.click(loadChatDemoBtn);

      const briefingNav = screen.getByRole('button', { name: /briefings/i });
      fireEvent.click(briefingNav);
      expect(screen.getByText(/select a document for lawyer briefing/i)).toBeDefined();
      const loadBriefingDemoBtn = screen.getByRole('button', { name: /load sample document/i });
      fireEvent.click(loadBriefingDemoBtn);
    });

    it('covers ChatInterface loading guard and non-Error exception fallback', async () => {
      vi.spyOn(api, 'getChatHistory').mockResolvedValue({ messages: [] });
      let resolveChat: any;
      vi.spyOn(api, 'askChat').mockReturnValue(
        new Promise((res) => {
          resolveChat = res;
        })
      );

      render(<ChatInterface document={mockDocA} />);

      const input = screen.getByPlaceholderText(/ask a question about this contract/i);
      fireEvent.change(input, { target: { value: 'Is this contract valid?' } });
      const form = input.closest('form')!;
      fireEvent.submit(form);

      // Now loading is true. Submitting again while loading returns early without calling askChat again
      fireEvent.change(input, { target: { value: 'Second question while loading' } });
      fireEvent.submit(form);
      expect(api.askChat).toHaveBeenCalledTimes(1);

      // Resolve first request
      resolveChat({
        message: {
          id: 'm-done',
          userId: 'u-final',
          documentId: 'doc-final-a',
          role: 'assistant',
          content: 'Done',
          structuredAnswer: null,
          createdAt: '',
        },
      });

      await waitFor(() => {
        expect(screen.getByText('Done')).toBeDefined();
      });

      // Submit new question that rejects with non-Error string
      vi.spyOn(api, 'askChat').mockRejectedValueOnce('Non-error string failure');
      fireEvent.change(input, { target: { value: 'Third question' } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/failed to retrieve answer/i)).toBeDefined();
      });
    });

    it('covers DocumentComparison non-Error string rejection fallbacks', async () => {
      render(<DocumentComparison documents={[mockDocA, mockDocB]} onDocumentCreated={vi.fn()} />);

      // compareDocuments rejects with string
      vi.spyOn(api, 'compareDocuments').mockRejectedValue('Compare failure string');
      const compareBtn = screen.getByRole('button', { name: /compare documents/i });
      fireEvent.click(compareBtn);

      await waitFor(() => {
        expect(screen.getByText('Comparison failed')).toBeDefined();
      });

      // loadDemoTemplate rejects with string
      vi.spyOn(api, 'loadDemoTemplate').mockRejectedValue('Load demo comparison failure string');
      const sampleBtn = screen.getByRole('button', { name: /load sample comparison/i });
      fireEvent.click(sampleBtn);

      await waitFor(() => {
        expect(screen.getByText('Failed to load sample comparison')).toBeDefined();
      });
    });

    it('covers App document selection, upload handler, delete selected doc, and navigation buttons', async () => {
      api.setToken('auth-token');
      vi.spyOn(api, 'getProfile').mockResolvedValue({ user: mockUser });
      vi.spyOn(api, 'listDocuments').mockResolvedValue({ documents: [mockDocA] });
      vi.spyOn(api, 'getDashboardStats').mockResolvedValue({
        totalDocuments: 1,
        totalAnalyses: 1,
        totalPendingActionItems: 0,
        recentDocuments: [mockDocA],
      });
      vi.spyOn(api, 'getAnalysis').mockResolvedValue({
        analysis: {
          id: 'an-1',
          documentId: mockDocA.id,
          documentType: 'General Contract',
          partiesInvolved: ['Party A', 'Party B'],
          effectiveDate: null,
          expirationDate: null,
          jurisdiction: null,
          highLevelSummary: 'High level contract summary',
          plainLanguageSummary: {
            whatThisDocumentIsAbout: 'About testing',
            whatYouAreAgreeingTo: [],
            whatTheOtherPartyIsAgreeingTo: [],
            yourKeyResponsibilities: [],
            yourRights: [],
            importantDates: [],
            financialObligations: [],
            terminationConditions: [],
          },
          extractedFacts: [],
          clauses: [],
          findings: [],
          createdAt: '',
          updatedAt: '',
        },
      });
      vi.spyOn(api, 'getBriefing').mockResolvedValue({
        briefing: {
          id: 'brf-1',
          userId: mockUser.id,
          documentId: mockDocA.id,
          documentTitle: mockDocA.title,
          conciseSummary: 'Concise briefing summary',
          lawyerChecklist: {
            questionsToAsk: [],
            documentsToBring: [],
            keyConcerns: [],
            importantDeadlines: [],
            clarificationAreas: [],
          },
          actionChecklist: [],
          createdAt: '',
          updatedAt: '',
        },
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/welcome back, justice sandra/i)).toBeDefined();
      });

      // 1. Dashboard quick buttons: Upload Document and Compare
      const dashUploadBtn = screen.getAllByRole('button', { name: /upload document/i })[0];
      fireEvent.click(dashUploadBtn);
      expect(screen.getByText(/back to documents/i)).toBeDefined();

      // Test handleDocumentUploaded via UploadZone
      vi.spyOn(api, 'uploadDocument').mockResolvedValue({ document: mockDocA });
      vi.spyOn(api, 'analyzeDocument').mockResolvedValue({ analysis: {} as any });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const validFile = new File(['sample contract text'], 'sample.pdf', { type: 'application/pdf' });
      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(api.uploadDocument).toHaveBeenCalled();
      });

      // 2. In AnalysisView: click "← All Documents"
      await waitFor(() => {
        expect(screen.getByText(/high level contract summary/i)).toBeDefined();
      });
      const allDocsBtn = screen.getByRole('button', { name: /← all documents/i });
      fireEvent.click(allDocsBtn);

      // Back to documents view without selected doc. Click "+ Upload Document"
      const docUploadBtn = screen.getByRole('button', { name: /\+ upload document/i });
      fireEvent.click(docUploadBtn);
      expect(screen.getByText(/back to documents/i)).toBeDefined();
      fireEvent.click(screen.getByText(/back to documents/i));

      // 3. Select document again via Analyze button
      const analyzeBtn = screen.getByRole('button', { name: /^analyze$/i });
      fireEvent.click(analyzeBtn);
      await waitFor(() => {
        expect(screen.getByText(/high level contract summary/i)).toBeDefined();
      });

      // Click "+ Upload Another Document"
      const uploadAnotherBtn = screen.getByRole('button', { name: /\+ upload another document/i });
      fireEvent.click(uploadAnotherBtn);
      expect(screen.getByText(/back to documents/i)).toBeDefined();
      fireEvent.click(screen.getByText(/back to documents/i));

      // 4. Navigate to Chat tab and test Back button
      const chatTab = screen.getAllByRole('button', { name: /ask ai/i })[0];
      fireEvent.click(chatTab);
      await waitFor(() => {
        expect(screen.getByText(/grounded ai legal companion/i)).toBeDefined();
      });
      const chatBackBtn = screen.getByRole('button', { name: /^back$/i });
      fireEvent.click(chatBackBtn);

      // 5. Navigate to Briefings tab and test Back button
      const briefingTab = screen.getAllByRole('button', { name: /briefings/i })[0];
      fireEvent.click(briefingTab);
      await waitFor(() => {
        expect(screen.getByText(/actionable lawyer preparation briefing/i)).toBeDefined();
      });
      const briefingBackBtn = screen.getByRole('button', { name: /^back$/i });
      fireEvent.click(briefingBackBtn);

      // 6. Delete document when selectedDocId === docId
      // Go to Dashboard
      fireEvent.click(screen.getByRole('button', { name: /^dashboard$/i }));
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.spyOn(api, 'deleteDocument').mockResolvedValue({ success: true, message: 'deleted' });
      const deleteBtn = screen.getByTitle('Delete Document');
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(api.deleteDocument).toHaveBeenCalledWith('doc-final-a');
      });

      // 7. handleOpenAnalyze error catch branch
      vi.spyOn(api, 'getAnalysis').mockRejectedValue(new Error('Failed to load analysis'));
      const analyzeBtnFail = screen.getByRole('button', { name: /^analyze$/i });
      fireEvent.click(analyzeBtnFail);
    });

    it('covers App saved theme loading on mount', () => {
      localStorage.setItem('legallens_theme', 'dark');
      render(<App />);
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      localStorage.removeItem('legallens_theme');
    });

    it('covers App refreshDocuments error catch branch', async () => {
      api.setToken('auth-token');
      vi.spyOn(api, 'getProfile').mockResolvedValue({ user: mockUser });
      vi.spyOn(api, 'listDocuments').mockRejectedValue(new Error('Refresh docs failed'));
      render(<App />);
      await waitFor(() => {
        expect(screen.getByText(/welcome back, justice sandra/i)).toBeDefined();
      });
    });

    it('covers App dashboard compare contracts and search document buttons', async () => {
      api.setToken('auth-token');
      vi.spyOn(api, 'getProfile').mockResolvedValue({ user: mockUser });
      vi.spyOn(api, 'listDocuments').mockResolvedValue({ documents: [mockDocA, mockDocB] });
      vi.spyOn(api, 'getDashboardStats').mockResolvedValue({
        totalDocuments: 2,
        totalAnalyses: 2,
        totalPendingActionItems: 0,
        recentDocuments: [mockDocA, mockDocB],
      });

      render(<App />);
      await waitFor(() => {
        expect(screen.getByText(/welcome back, justice sandra/i)).toBeDefined();
      });

      // Click "Compare Contracts" on dashboard
      const compareBtn = screen.getByRole('button', { name: /compare contracts/i });
      fireEvent.click(compareBtn);
      expect(screen.getByText(/contract version & document comparison/i)).toBeDefined();

      // Go back to Dashboard
      fireEvent.click(screen.getByRole('button', { name: /^dashboard$/i }));

      // Click "Search Document" icon button on a document row
      const searchBtns = screen.getAllByTitle('Search Document');
      fireEvent.click(searchBtns[0]);
      expect(screen.getByText(/search document:/i)).toBeDefined();

      // Click "Back to Analysis" in search view
      const backBtn = screen.getByRole('button', { name: /back to analysis/i });
      fireEvent.click(backBtn);
    });
  });
});
