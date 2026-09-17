import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { LegalDisclaimerBanner } from './components/LegalDisclaimerBanner';
import { Header, ActiveTab } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { DashboardView } from './components/DashboardView';
import { UploadZone } from './components/UploadZone';
import { AnalysisView } from './components/AnalysisView';
import { DocumentSearch } from './components/DocumentSearch';
import { DocumentComparison } from './components/DocumentComparison';
import { ChatInterface } from './components/ChatInterface';
import { ActionableBriefingView } from './components/ActionableBriefingView';
import { UserProfileView } from './components/UserProfileView';
import {
  api,
  SanitizedUser,
  LegalDocumentDTO,
  DocumentAnalysisDTO,
  DashboardStatsDTO,
} from './services/api';

export const App: React.FC = () => {
  const [user, setUser] = useState<SanitizedUser | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const [documents, setDocuments] = useState<LegalDocumentDTO[]>([]);
  const [stats, setStats] = useState<DashboardStatsDTO | null>(null);

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<DocumentAnalysisDTO | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [subView, setSubView] = useState<'default' | 'upload' | 'search'>('default');

  useEffect(() => {
    // Check theme preference
    const savedTheme = localStorage.getItem('legallens_theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    // Check user token
    if (api.getToken()) {
      loadProfileAndData();
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('legallens_theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const loadProfileAndData = async () => {
    try {
      const profile = await api.getProfile();
      setUser(profile.user);
      await refreshDocuments();
    } catch {
      api.logout();
      setUser(null);
    }
  };

  const refreshDocuments = async () => {
    try {
      const docsRes = await api.listDocuments();
      setDocuments(docsRes.documents);
      const statsRes = await api.getDashboardStats();
      setStats(statsRes);
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setDocuments([]);
    setStats(null);
    setSelectedDocId(null);
    setSelectedAnalysis(null);
    setActiveTab('help');
  };

  const handleOpenAnalyze = async (docId: string) => {
    setSelectedDocId(docId);
    setSubView('default');
    setActiveTab('documents');
    setAnalysisError(null);
    setAnalysisLoading(true);

    try {
      const res = await api.getAnalysis(docId);
      setSelectedAnalysis(res.analysis);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to analyze document';
      setAnalysisError(msg);
      setSelectedAnalysis(null);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleOpenChat = (docId: string) => {
    setSelectedDocId(docId);
    setActiveTab('chat');
  };

  const handleOpenBriefing = (docId: string) => {
    setSelectedDocId(docId);
    setActiveTab('briefings');
  };

  const handleOpenSearch = (docId: string) => {
    setSelectedDocId(docId);
    setSubView('search');
    setActiveTab('documents');
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Are you sure you want to permanently delete this document and all its analyses?')) return;
    try {
      await api.deleteDocument(docId);
      if (selectedDocId === docId) {
        setSelectedDocId(null);
        setSelectedAnalysis(null);
      }
      await refreshDocuments();
    } catch {
      // ignore
    }
  };

  const handleDocumentUploaded = async (doc: LegalDocumentDTO) => {
    await refreshDocuments();
    handleOpenAnalyze(doc.id);
  };

  const handleLoadSampleDemo = async () => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    try {
      const res = await api.loadDemoTemplate('demo-employment');
      await refreshDocuments();
      handleOpenAnalyze(res.document.id);
    } catch {
      // ignore
    }
  };

  const selectedDocument = documents.find((d) => d.id === selectedDocId) || documents[0];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <LegalDisclaimerBanner />
      <Header
        user={user}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setSubView('default');
        }}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main style={{ flexGrow: 1, padding: '2rem 0' }}>
        <div className="app-container">
          {!user || activeTab === 'help' ? (
            <LandingPage
              onGetStarted={() => setIsAuthOpen(true)}
              onTryDemo={handleLoadSampleDemo}
            />
          ) : activeTab === 'dashboard' ? (
            <DashboardView
              user={user}
              stats={stats}
              documents={documents}
              onOpenUpload={() => {
                setActiveTab('documents');
                setSubView('upload');
              }}
              onOpenCompare={() => setActiveTab('compare')}
              onOpenChat={handleOpenChat}
              onOpenAnalyze={handleOpenAnalyze}
              onOpenBriefing={handleOpenBriefing}
              onOpenSearch={handleOpenSearch}
              onDeleteDoc={handleDeleteDoc}
              onLoadDemo={handleLoadSampleDemo}
            />
          ) : activeTab === 'documents' ? (
            <div>
              {subView === 'upload' ? (
                <div>
                  <button
                    onClick={() => setSubView('default')}
                    className="btn btn-secondary"
                    style={{ marginBottom: '1.5rem' }}
                  >
                    ← Back to Documents
                  </button>
                  <UploadZone onDocumentUploaded={handleDocumentUploaded} />
                </div>
              ) : subView === 'search' && selectedDocument ? (
                <DocumentSearch
                  documentId={selectedDocument.id}
                  documentTitle={selectedDocument.title}
                  onBack={() => setSubView('default')}
                />
              ) : selectedDocument && selectedAnalysis ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <button
                      onClick={() => {
                        setSelectedDocId(null);
                        setSelectedAnalysis(null);
                        setAnalysisError(null);
                      }}
                      className="btn btn-secondary"
                    >
                      ← All Documents
                    </button>
                    <button onClick={() => setSubView('upload')} className="btn btn-primary">
                      + Upload Another Document
                    </button>
                  </div>
                  <AnalysisView
                    document={selectedDocument}
                    analysis={selectedAnalysis}
                    onOpenChat={handleOpenChat}
                    onOpenBriefing={handleOpenBriefing}
                    onOpenSearch={handleOpenSearch}
                  />
                </div>
              ) : selectedDocument && (analysisLoading || analysisError) ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <button
                      onClick={() => {
                        setSelectedDocId(null);
                        setSelectedAnalysis(null);
                        setAnalysisError(null);
                      }}
                      className="btn btn-secondary"
                    >
                      ← All Documents
                    </button>
                  </div>
                  <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                    {analysisLoading ? (
                      <div>
                        <Loader2
                          size={44}
                          className="spinner animate-spin"
                          style={{
                            color: 'var(--primary-600)',
                            margin: '0 auto 1.25rem',
                            animation: 'spin 0.85s linear infinite',
                            WebkitAnimation: 'spin 0.85s linear infinite',
                            display: 'inline-block',
                          }}
                          aria-hidden="true"
                        />
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Analyzing Document with Gemini...</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>Extracting legal structure, plain-language summaries, clauses, and key risks.</p>
                      </div>
                    ) : (
                      <div role="alert">
                        <div style={{ color: 'var(--rose-500)', fontSize: '2rem', marginBottom: '0.75rem' }}>⚠️</div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Document Analysis Unavailable</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: '600px', margin: '0 auto 1.5rem' }}>{analysisError}</p>
                        <button onClick={() => handleOpenAnalyze(selectedDocument.id)} className="btn btn-primary">
                          Retry Analysis
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>My Legal Documents</h2>
                    <button onClick={() => setSubView('upload')} className="btn btn-primary">
                      + Upload Document
                    </button>
                  </div>
                  <DashboardView
                    user={user}
                    stats={stats}
                    documents={documents}
                    onOpenUpload={() => setSubView('upload')}
                    onOpenCompare={() => setActiveTab('compare')}
                    onOpenChat={handleOpenChat}
                    onOpenAnalyze={handleOpenAnalyze}
                    onOpenBriefing={handleOpenBriefing}
                    onOpenSearch={handleOpenSearch}
                    onDeleteDoc={handleDeleteDoc}
                    onLoadDemo={handleLoadSampleDemo}
                  />
                </div>
              )}
            </div>
          ) : activeTab === 'compare' ? (
            <DocumentComparison documents={documents} onDocumentCreated={refreshDocuments} />
          ) : activeTab === 'chat' ? (
            selectedDocument ? (
              <ChatInterface
                document={selectedDocument}
                onBack={() => setActiveTab('documents')}
              />
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Select a Document for AI Chat</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  Please upload or select an agreement to ask grounded questions.
                </p>
                <button onClick={handleLoadSampleDemo} className="btn btn-primary">
                  Load Sample Document & Ask AI
                </button>
              </div>
            )
          ) : activeTab === 'briefings' ? (
            selectedDocument ? (
              <ActionableBriefingView
                document={selectedDocument}
                onBack={() => setActiveTab('documents')}
              />
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Select a Document for Lawyer Briefing</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  Choose a contract to generate targeted consultation questions and action items.
                </p>
                <button onClick={handleLoadSampleDemo} className="btn btn-primary">
                  Load Sample Document
                </button>
              </div>
            )
          ) : (
            <UserProfileView
              user={user}
              documentCount={documents.length}
              onAccountDeleted={handleLogout}
            />
          )}
        </div>
      </main>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(newUser) => {
          setUser(newUser);
          setActiveTab('dashboard');
          refreshDocuments();
        }}
      />
    </div>
  );
};
