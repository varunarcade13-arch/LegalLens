import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../../src/client/App';
import { api, LegalDocumentDTO, DocumentAnalysisDTO, DashboardStatsDTO } from '../../src/client/services/api';

describe('App Main Component & Navigation Flow', () => {
  const mockUser = {
    id: 'user-app-1',
    name: 'Elena Kagan',
    email: 'elena@legallens.test',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  };

  const mockDoc: LegalDocumentDTO = {
    id: 'doc-app-1',
    userId: 'user-app-1',
    title: 'Consulting Services Agreement',
    originalFilename: 'consulting.txt',
    mimeType: 'text/plain',
    fileSizeBytes: 2048,
    pageCount: 3,
    characterCount: 1200,
    status: 'ready',
    errorMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockAnalysis: DocumentAnalysisDTO = {
    id: 'analysis-1',
    documentId: 'doc-app-1',
    documentType: 'Services',
    partiesInvolved: ['Client Corp', 'Consultant LLC'],
    effectiveDate: '2025-01-01',
    expirationDate: '2025-12-31',
    jurisdiction: 'New York',
    highLevelSummary: 'Consulting deliverables and payment terms.',
    plainLanguageSummary: {
      whatThisDocumentIsAbout: 'Consulting scope and fees.',
      whatYouAreAgreeingTo: ['Provide consulting services'],
      whatTheOtherPartyIsAgreeingTo: ['Pay invoices in Net 30'],
      yourKeyResponsibilities: ['Deliver monthly status reports'],
      yourRights: ['Right to terminate with 30 days notice'],
      importantDates: ['Effective Jan 1, 2025'],
      financialObligations: ['$10,000 monthly fee'],
      terminationConditions: ['30 days written notice'],
    },
    extractedFacts: [],
    clauses: [],
    findings: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockStats: DashboardStatsDTO = {
    totalDocuments: 1,
    totalAnalyses: 1,
    totalPendingActionItems: 2,
    recentDocuments: [mockDoc],
  };

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders landing page when user is not logged in', () => {
    render(<App />);

    expect(screen.getByRole('complementary', { name: /legal information disclaimer/i })).toBeDefined();
    expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
    expect(screen.getByRole('button', { name: /sign in \/ register/i })).toBeDefined();
  });

  it('toggles theme between light and dark mode and saves to localStorage', () => {
    render(<App />);

    const themeBtn = screen.getByRole('button', { name: /switch to dark theme/i });
    fireEvent.click(themeBtn);

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('legallens_theme')).toBe('dark');

    const lightBtn = screen.getByRole('button', { name: /switch to light theme/i });
    fireEvent.click(lightBtn);

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('legallens_theme')).toBe('light');
  });

  it('loads saved profile and documents on mount when auth token exists', async () => {
    api.setToken('stored-valid-token');

    vi.spyOn(api, 'getProfile').mockResolvedValueOnce({ user: mockUser });
    vi.spyOn(api, 'listDocuments').mockResolvedValueOnce({ documents: [mockDoc] });
    vi.spyOn(api, 'getDashboardStats').mockResolvedValueOnce(mockStats);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/welcome back, elena kagan/i)).toBeDefined();
      expect(screen.getByText('Consulting Services Agreement')).toBeDefined();
    });
  });

  it('handles user authentication modal and logs in', async () => {
    vi.spyOn(api, 'listDocuments').mockResolvedValue({ documents: [mockDoc] });
    vi.spyOn(api, 'getDashboardStats').mockResolvedValue(mockStats);
    vi.spyOn(api, 'login').mockResolvedValueOnce({ user: mockUser, token: 'jwt-new' });

    render(<App />);

    const signInBtn = screen.getByRole('button', { name: /sign in \/ register/i });
    fireEvent.click(signInBtn);

    expect(screen.getByRole('dialog')).toBeDefined();

    const emailInput = screen.getByPlaceholderText(/name@example.com/i);
    fireEvent.change(emailInput, { target: { value: 'elena@legallens.test' } });

    const passInput = screen.getByPlaceholderText(/••••••••/i);
    fireEvent.change(passInput, { target: { value: 'Password123!' } });

    const submitBtn = screen.getByRole('button', { name: /^sign in$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/welcome back, elena kagan/i)).toBeDefined();
    });
  });

  it('navigates between dashboard, document analysis, search, compare, chat, and profile tabs', async () => {
    api.setToken('stored-valid-token');
    vi.spyOn(api, 'getProfile').mockResolvedValue({ user: mockUser });
    vi.spyOn(api, 'listDocuments').mockResolvedValue({ documents: [mockDoc] });
    vi.spyOn(api, 'getDashboardStats').mockResolvedValue(mockStats);
    vi.spyOn(api, 'getAnalysis').mockResolvedValue({ analysis: mockAnalysis });
    vi.spyOn(api, 'getChatHistory').mockResolvedValue({ messages: [] });
    vi.spyOn(api, 'getBriefing').mockResolvedValue({
      briefing: {
        id: 'b1',
        userId: mockUser.id,
        documentId: mockDoc.id,
        documentTitle: mockDoc.title,
        conciseSummary: 'Briefing summary',
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
      expect(screen.getByText(/welcome back, elena kagan/i)).toBeDefined();
    });

    // Open Analyze view
    const analyzeBtn = screen.getByRole('button', { name: /^analyze$/i });
    fireEvent.click(analyzeBtn);

    await waitFor(() => {
      expect(screen.getByText('Consulting scope and fees.')).toBeDefined();
    });

    // Navigate to Compare tab
    const compareTab = screen.getByRole('button', { name: /compare/i });
    fireEvent.click(compareTab);
    expect(screen.getByText(/contract version & document comparison/i)).toBeDefined();

    // Navigate to Ask AI tab
    const chatTab = screen.getByRole('button', { name: /ask ai/i });
    fireEvent.click(chatTab);
    expect(screen.getByText(/grounded ai legal companion/i)).toBeDefined();

    // Navigate to Briefings tab
    const briefingsTab = screen.getByRole('button', { name: /briefings/i });
    fireEvent.click(briefingsTab);
    await waitFor(() => {
      expect(screen.getByText(/actionable lawyer preparation briefing/i)).toBeDefined();
    });

    // Navigate to Profile tab
    const profileBtn = screen.getByRole('button', { name: /user profile/i });
    fireEvent.click(profileBtn);
    expect(screen.getByText(/danger zone: delete account/i)).toBeDefined();

    // Logout
    const logoutBtn = screen.getByRole('button', { name: /log out/i });
    fireEvent.click(logoutBtn);

    expect(screen.getByText(/understand legal documents/i)).toBeDefined();
  });

  it('handles document deletion with confirmation dialog', async () => {
    api.setToken('stored-valid-token');
    vi.spyOn(api, 'getProfile').mockResolvedValue({ user: mockUser });
    vi.spyOn(api, 'listDocuments').mockResolvedValue({ documents: [mockDoc] });
    vi.spyOn(api, 'getDashboardStats').mockResolvedValue(mockStats);
    vi.spyOn(api, 'deleteDocument').mockResolvedValue({ success: true, message: 'deleted' });

    // Mock confirm
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Consulting Services Agreement')).toBeDefined();
    });

    const deleteBtn = screen.getByTitle('Delete Document');
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(api.deleteDocument).toHaveBeenCalledWith('doc-app-1');
  });

  it('loads fictional demo template when clicking Explore Fictional Demo', async () => {
    api.setToken('stored-valid-token');
    vi.spyOn(api, 'getProfile').mockResolvedValue({ user: mockUser });
    vi.spyOn(api, 'listDocuments').mockResolvedValue({ documents: [] });
    vi.spyOn(api, 'getDashboardStats').mockResolvedValue({ ...mockStats, totalDocuments: 0 });
    vi.spyOn(api, 'loadDemoTemplate').mockResolvedValue({
      message: 'loaded',
      document: mockDoc,
    });
    vi.spyOn(api, 'getAnalysis').mockResolvedValue({ analysis: mockAnalysis });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/welcome back, elena kagan/i)).toBeDefined();
    });

    const tryDemoBtns = screen.getAllByRole('button', { name: /try demo contract/i });
    fireEvent.click(tryDemoBtns[0]);

    await waitFor(() => {
      expect(api.loadDemoTemplate).toHaveBeenCalledWith('demo-employment');
    });
  });

  it('opens auth modal when clicking Get Started Free on landing page and closes it', () => {
    render(<App />);

    const getStartedBtn = screen.getByRole('button', { name: /get started free/i });
    fireEvent.click(getStartedBtn);

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText(/sign in to legallens/i)).toBeDefined();

    // Also close dialog to test onClose
    const closeBtn = screen.getByRole('button', { name: /close dialog/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('handles embedded DashboardView onOpenUpload and onOpenCompare in documents tab', async () => {
    const mockDoc2 = { ...mockDoc, id: 'doc-app-2', title: 'Employment Agreement' };
    api.setToken('stored-valid-token');
    vi.spyOn(api, 'getProfile').mockResolvedValue({ user: mockUser });
    vi.spyOn(api, 'listDocuments').mockResolvedValue({ documents: [mockDoc, mockDoc2] });
    vi.spyOn(api, 'getDashboardStats').mockResolvedValue({
      totalDocuments: 2,
      totalAnalyses: 2,
      totalPendingActionItems: 0,
      recentDocuments: [mockDoc, mockDoc2],
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/welcome back, elena kagan/i)).toBeDefined();
    });

    // Switch to documents tab (which has no selected doc, rendering "My Legal Documents" and embedded DashboardView)
    const docsTab = screen.getByRole('button', { name: /my documents/i });
    fireEvent.click(docsTab);

    expect(screen.getByText('My Legal Documents')).toBeDefined();

    // Test onOpenCompare in embedded DashboardView
    const compareBtn = screen.getByRole('button', { name: /compare contracts/i });
    fireEvent.click(compareBtn);
    expect(screen.getByText(/contract version & document comparison/i)).toBeDefined();

    // Switch back to documents tab
    fireEvent.click(screen.getByRole('button', { name: /my documents/i }));

    // Test onOpenUpload in embedded DashboardView
    const uploadBtns = screen.getAllByRole('button', { name: /upload document/i });
    // Click the upload button inside DashboardView
    fireEvent.click(uploadBtns[uploadBtns.length - 1]);
    expect(screen.getByText(/back to documents/i)).toBeDefined();
  });
});

