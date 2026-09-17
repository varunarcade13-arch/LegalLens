import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Square,
  Download,
  Copy,
  Check,
  Calendar,
  AlertTriangle,
  FileCheck,
  FileQuestion,
  Loader2,
} from 'lucide-react';
import { api, LegalBriefingDTO, LegalDocumentDTO } from '../services/api';

interface ActionableBriefingViewProps {
  document: LegalDocumentDTO;
  onBack?: () => void;
}

export const ActionableBriefingView: React.FC<ActionableBriefingViewProps> = ({
  document,
  onBack,
}) => {
  const [briefing, setBriefing] = useState<LegalBriefingDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadBriefing();
  }, [document.id]);

  const loadBriefing = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getBriefing(document.id);
      setBriefing(res.briefing);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not load briefing for this document.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (itemId: string, currentCompleted: boolean) => {
    try {
      setActionError(null);
      const res = await api.toggleChecklist(document.id, itemId, !currentCompleted);
      setBriefing(res.briefing);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update checklist item';
      setActionError(msg);
    }
  };

  const handleCopyMarkdown = async () => {
    try {
      setActionError(null);
      const markdown = await api.exportBriefingMarkdown(document.id);
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to export markdown';
      setActionError(msg);
    }
  };

  const handleDownloadMarkdown = async () => {
    try {
      setActionError(null);
      const markdown = await api.exportBriefingMarkdown(document.id);
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `LegalBriefing_${document.title.replace(/\s+/g, '_')}.md`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to download briefing markdown';
      setActionError(msg);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
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
        <h3>Generating Actionable Lawyer Briefing...</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Synthesizing consultation questions, evidence checklist, and action items.</p>
      </div>
    );
  }

  if (error || !briefing) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ color: 'var(--rose-500)', fontSize: '2rem', marginBottom: '0.75rem' }}>⚠️</div>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Failed to Load Lawyer Briefing</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: '600px', margin: '0 auto 1.5rem' }}>
          Could not load briefing for this document.{error ? ` (${error})` : ''}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          {onBack && (
            <button onClick={onBack} className="btn btn-secondary">
              Back to Documents
            </button>
          )}
          <button onClick={loadBriefing} className="btn btn-primary">
            Retry Briefing
          </button>
        </div>
      </div>
    );
  }

  const completedCount = briefing.actionChecklist.filter((i) => i.completed).length;
  const totalCount = briefing.actionChecklist.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {actionError && (
        <div role="alert" style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', background: 'var(--rose-bg)', color: 'var(--rose-600)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}
      {/* Action Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {onBack && (
            <button onClick={onBack} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem' }}>
              Back
            </button>
          )}
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              Actionable Lawyer Preparation Briefing
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Contract: <strong>{briefing.documentTitle}</strong>
              </span>
              <span className="badge badge-sky">AI Provider: Gemini</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleCopyMarkdown} className="btn btn-secondary">
            {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Briefing'}</span>
          </button>
          <button onClick={handleDownloadMarkdown} className="btn btn-primary">
            <Download size={16} aria-hidden="true" />
            <span>Download Markdown (.md)</span>
          </button>
        </div>
      </div>

      {/* Concise Summary */}
      <div className="card" style={{ borderLeft: '4px solid var(--primary-600)' }}>
        <span className="badge badge-sky" style={{ marginBottom: '0.5rem' }}>
          Executive Consultation Brief
        </span>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {briefing.conciseSummary}
        </p>
      </div>

      {/* Progress & Interactive Action Checklist */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Interactive Pre-Signing Action Checklist</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Track important verification steps before finalizing or signing this document.
            </p>
          </div>
          <span className="badge badge-emerald" style={{ fontSize: '0.8125rem' }}>
            {completedCount} / {totalCount} Completed ({progressPercent}%)
          </span>
        </div>

        {/* Progress Bar */}
        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{
            height: '8px',
            background: 'var(--bg-muted)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, var(--primary-600), var(--emerald-badge))',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {briefing.actionChecklist.map((item) => (
            <div
              key={item.id}
              onClick={() => handleToggle(item.id, item.completed)}
              role="checkbox"
              aria-checked={item.completed}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  handleToggle(item.id, item.completed);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: item.completed ? 'var(--emerald-bg)' : 'var(--bg-app)',
                border: `1px solid ${item.completed ? 'var(--emerald-border)' : 'var(--border-color)'}`,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {item.completed ? (
                <CheckSquare size={20} style={{ color: 'var(--emerald-badge)', flexShrink: 0 }} aria-hidden="true" />
              ) : (
                <Square size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} aria-hidden="true" />
              )}
              <div style={{ flexGrow: 1 }}>
                <span
                  style={{
                    fontSize: '0.925rem',
                    textDecoration: item.completed ? 'line-through' : 'none',
                    color: item.completed ? 'var(--emerald-text)' : 'var(--text-primary)',
                    fontWeight: 500,
                  }}
                >
                  {item.label}
                </span>
              </div>
              <span className="badge badge-sky" style={{ fontSize: '0.7rem' }}>
                {item.category}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: Lawyer Consultation Checklist */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Questions to ask */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <FileQuestion size={20} style={{ color: 'var(--primary-600)' }} aria-hidden="true" />
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Questions to Ask Your Lawyer</h4>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Bring these targeted questions to your attorney consultation:
          </p>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {briefing.lawyerChecklist.questionsToAsk.map((q, idx) => (
              <li key={idx} style={{ marginBottom: '0.65rem', lineHeight: 1.5 }}>
                {q}
              </li>
            ))}
          </ul>
        </div>

        {/* Documents to bring */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <FileCheck size={20} style={{ color: 'var(--emerald-badge)' }} aria-hidden="true" />
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Documents & Evidence to Bring</h4>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Supporting records to furnish for thorough legal review:
          </p>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {briefing.lawyerChecklist.documentsToBring.map((d, idx) => (
              <li key={idx} style={{ marginBottom: '0.65rem', lineHeight: 1.5 }}>
                {d}
              </li>
            ))}
          </ul>
        </div>

        {/* Key Concerns */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <AlertTriangle size={20} style={{ color: 'var(--amber-badge)' }} aria-hidden="true" />
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Key Identified Concerns</h4>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Specific terms flagged for careful risk assessment:
          </p>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {briefing.lawyerChecklist.keyConcerns.map((c, idx) => (
              <li key={idx} style={{ marginBottom: '0.65rem', lineHeight: 1.5 }}>
                {c}
              </li>
            ))}
          </ul>
        </div>

        {/* Important Deadlines */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Calendar size={20} style={{ color: 'var(--sky-badge)' }} aria-hidden="true" />
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Important Milestones & Dates</h4>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Critical operational deadlines and notice periods:
          </p>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {briefing.lawyerChecklist.importantDeadlines.map((dl, idx) => (
              <li key={idx} style={{ marginBottom: '0.65rem', lineHeight: 1.5 }}>
                {dl}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
