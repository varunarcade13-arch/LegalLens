import React from 'react';
import {
  FileText,
  Upload,
  GitCompare,
  MessageSquare,
  Sparkles,
  ClipboardList,
  Search,
  Trash2,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { LegalDocumentDTO, DashboardStatsDTO, SanitizedUser } from '../services/api';

interface DashboardViewProps {
  user: SanitizedUser;
  stats: DashboardStatsDTO | null;
  documents: LegalDocumentDTO[];
  onOpenUpload: () => void;
  onOpenCompare: () => void;
  onOpenChat: (docId: string) => void;
  onOpenAnalyze: (docId: string) => void;
  onOpenBriefing: (docId: string) => void;
  onOpenSearch: (docId: string) => void;
  onDeleteDoc: (docId: string) => void;
  onLoadDemo: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  stats,
  documents,
  onOpenUpload,
  onOpenCompare,
  onOpenChat,
  onOpenAnalyze,
  onOpenBriefing,
  onOpenSearch,
  onDeleteDoc,
  onLoadDemo,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Welcome Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-card-hover) 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            Welcome back, {user.name}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Your legal companion workspace. Upload, simplify, ask questions, and prepare actionable lawyer briefings.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={onOpenUpload} className="btn btn-primary">
            <Upload size={16} aria-hidden="true" />
            <span>Upload Document</span>
          </button>
          <button onClick={onLoadDemo} className="btn btn-secondary">
            <Sparkles size={16} style={{ color: 'var(--primary-600)' }} aria-hidden="true" />
            <span>Try Demo Contract</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--primary-50)',
              color: 'var(--primary-600)',
            }}
          >
            <FileText size={24} aria-hidden="true" />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              TOTAL DOCUMENTS
            </span>
            <strong style={{ display: 'block', fontSize: '1.5rem' }}>
              {stats ? stats.totalDocuments : documents.length}
            </strong>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--emerald-bg)',
              color: 'var(--emerald-text)',
            }}
          >
            <CheckCircle2 size={24} aria-hidden="true" />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              ANALYSES GENERATED
            </span>
            <strong style={{ display: 'block', fontSize: '1.5rem' }}>
              {stats ? stats.totalAnalyses : documents.filter((d) => d.status === 'ready').length}
            </strong>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--amber-bg)',
              color: 'var(--amber-text)',
            }}
          >
            <Clock size={24} aria-hidden="true" />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              PENDING ACTION ITEMS
            </span>
            <strong style={{ display: 'block', fontSize: '1.5rem' }}>
              {stats ? stats.totalPendingActionItems : 0}
            </strong>
          </div>
        </div>
      </div>

      {/* Recent Documents Table */}
      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Your Legal Documents</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Documents securely stored in your private, isolated workspace.
            </p>
          </div>
          {documents.length > 0 && (
            <button onClick={onOpenCompare} className="btn btn-secondary" style={{ fontSize: '0.875rem' }}>
              <GitCompare size={15} aria-hidden="true" />
              <span>Compare Contracts</span>
            </button>
          )}
        </div>

        {documents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
            <FileText size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} aria-hidden="true" />
            <h4 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              No documents uploaded yet
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '420px', marginInline: 'auto' }}>
              Upload your first legal document or load a fictional demo to explore automated plain-language analysis.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button onClick={onOpenUpload} className="btn btn-primary">
                <Upload size={16} aria-hidden="true" />
                <span>Upload Contract</span>
              </button>
              <button onClick={onLoadDemo} className="btn btn-secondary">
                <Sparkles size={16} aria-hidden="true" />
                <span>Try Demo Contract</span>
              </button>
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-card-hover)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Document Title</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Format</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Pages / Characters</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <strong
                        onClick={() => onOpenAnalyze(doc.id)}
                        style={{ color: 'var(--primary-600)', cursor: 'pointer', display: 'block', fontSize: '0.95rem' }}
                      >
                        {doc.title}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {doc.originalFilename}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span className="badge badge-sky" style={{ fontSize: '0.7rem' }}>
                        {doc.originalFilename.split('.').pop()?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                      {doc.pageCount} page(s) • {doc.characterCount.toLocaleString()} chars
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span className="badge badge-emerald">Ready</span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button
                          onClick={() => onOpenAnalyze(doc.id)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                          title="View Analysis"
                        >
                          Analyze
                        </button>
                        <button
                          onClick={() => onOpenChat(doc.id)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                          title="Ask AI"
                        >
                          <MessageSquare size={14} aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => onOpenBriefing(doc.id)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                          title="Lawyer Briefing"
                        >
                          <ClipboardList size={14} aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => onOpenSearch(doc.id)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                          title="Search Document"
                        >
                          <Search size={14} aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => onDeleteDoc(doc.id)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', color: 'var(--rose-badge)' }}
                          title="Delete Document"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
