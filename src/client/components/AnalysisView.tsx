import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Info,
  MessageSquare,
  ClipboardList,
  Search,
  CheckCircle,
} from 'lucide-react';
import { DocumentAnalysisDTO, LegalDocumentDTO } from '../services/api';

interface AnalysisViewProps {
  document: LegalDocumentDTO;
  analysis: DocumentAnalysisDTO;
  onOpenChat: (docId: string) => void;
  onOpenBriefing: (docId: string) => void;
  onOpenSearch: (docId: string) => void;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({
  document,
  analysis,
  onOpenChat,
  onOpenBriefing,
  onOpenSearch,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'clauses' | 'risks' | 'facts'>('summary');
  const [clauseCategoryFilter, setClauseCategoryFilter] = useState<string>('all');
  const [expandedClauseId, setExpandedClauseId] = useState<string | null>(null);

  const getConcernBadge = (level: string) => {
    switch (level) {
      case 'high_attention':
        return <span className="badge badge-rose">Potential area to review</span>;
      case 'review_carefully':
        return <span className="badge badge-amber">May warrant clarification</span>;
      case 'informational':
      default:
        return <span className="badge badge-sky">Informational</span>;
    }
  };

  const filteredClauses =
    clauseCategoryFilter === 'all'
      ? analysis.clauses
      : analysis.clauses.filter((c) => c.category === clauseCategoryFilter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-card-hover) 100%)',
          borderLeft: '4px solid var(--primary-600)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              <span className="badge badge-emerald">{analysis.documentType}</span>
              <span className="badge badge-sky">AI Provider: Gemini</span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {document.pageCount} page(s) • {document.characterCount.toLocaleString()} characters
              </span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {document.title}
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => onOpenChat(document.id)}
              className="btn btn-primary"
              style={{ fontSize: '0.875rem' }}
            >
              <MessageSquare size={16} aria-hidden="true" />
              <span>Ask AI</span>
            </button>
            <button
              onClick={() => onOpenBriefing(document.id)}
              className="btn btn-secondary"
              style={{ fontSize: '0.875rem' }}
            >
              <ClipboardList size={16} aria-hidden="true" />
              <span>Lawyer Checklist</span>
            </button>
            <button
              onClick={() => onOpenSearch(document.id)}
              className="btn btn-secondary"
              style={{ fontSize: '0.875rem' }}
            >
              <Search size={16} aria-hidden="true" />
              <span>Search Document</span>
            </button>
          </div>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          {analysis.highLevelSummary}
        </p>

        {/* Metadata Badges */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-color)',
            fontSize: '0.875rem',
          }}
        >
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>
              PARTIES INVOLVED
            </span>
            <strong style={{ color: 'var(--text-primary)' }}>
              {analysis.partiesInvolved.join(' & ')}
            </strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>
              EFFECTIVE DATE
            </span>
            <strong style={{ color: 'var(--text-primary)' }}>
              {analysis.effectiveDate || 'Upon execution'}
            </strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>
              GOVERNING JURISDICTION
            </span>
            <strong style={{ color: 'var(--text-primary)' }}>
              {analysis.jurisdiction ? `State of ${analysis.jurisdiction}` : 'Not explicitly specified'}
            </strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>
              EXPIRATION / RENEWAL
            </span>
            <strong style={{ color: 'var(--text-primary)' }}>
              {analysis.expirationDate || 'Subject to notice terms'}
            </strong>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div
        role="tablist"
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          gap: '1rem',
        }}
      >
        {[
          { key: 'summary', label: 'Plain-Language Translation' },
          { key: 'clauses', label: `Important Clauses (${analysis.clauses.length})` },
          { key: 'risks', label: `Risk & Attention Areas (${analysis.findings.length})` },
          { key: 'facts', label: `Extracted Facts (${analysis.extractedFacts.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '0.75rem 0.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid var(--primary-600)' : '3px solid transparent',
              color: activeTab === tab.key ? 'var(--primary-600)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Plain Language Translation */}
      {activeTab === 'summary' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              What this document is about
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.25rem' }}>
              {analysis.plainLanguageSummary.whatThisDocumentIsAbout}
            </p>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--primary-600)' }}>
              What you are agreeing to:
            </h4>
            <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              {analysis.plainLanguageSummary.whatYouAreAgreeingTo.map((item, idx) => (
                <li key={idx} style={{ marginBottom: '0.4rem' }}>{item}</li>
              ))}
            </ul>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--emerald-text)' }}>
              What the other party is agreeing to:
            </h4>
            <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {analysis.plainLanguageSummary.whatTheOtherPartyIsAgreeingTo.map((item, idx) => (
                <li key={idx} style={{ marginBottom: '0.4rem' }}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              Your Key Responsibilities & Rights
            </h3>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--amber-text)' }}>
              Your Key Responsibilities:
            </h4>
            <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              {analysis.plainLanguageSummary.yourKeyResponsibilities.map((item, idx) => (
                <li key={idx} style={{ marginBottom: '0.4rem' }}>{item}</li>
              ))}
            </ul>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--sky-text)' }}>
              Your Rights under this Agreement:
            </h4>
            <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {analysis.plainLanguageSummary.yourRights.map((item, idx) => (
                <li key={idx} style={{ marginBottom: '0.4rem' }}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              Financial & Payment Obligations
            </h3>
            <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              {analysis.plainLanguageSummary.financialObligations.map((item, idx) => (
                <li key={idx} style={{ marginBottom: '0.4rem' }}>{item}</li>
              ))}
            </ul>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Important Deadlines & Milestones:
            </h4>
            <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {analysis.plainLanguageSummary.importantDates.map((item, idx) => (
                <li key={idx} style={{ marginBottom: '0.4rem' }}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              Termination & Cancellation Conditions
            </h3>
            <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {analysis.plainLanguageSummary.terminationConditions.map((item, idx) => (
                <li key={idx} style={{ marginBottom: '0.4rem' }}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Tab 2: Important Clauses */}
      {activeTab === 'clauses' && (
        <div>
          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {['all', 'indemnification', 'liability', 'termination', 'intellectual_property', 'non_compete', 'arbitration', 'payment_obligations', 'confidentiality'].map((cat) => (
              <button
                key={cat}
                onClick={() => setClauseCategoryFilter(cat)}
                className={`btn ${clauseCategoryFilter === cat ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem' }}
              >
                {cat.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredClauses.map((clause) => {
              const isExpanded = expandedClauseId === clause.id;
              return (
                <div key={clause.id} className="card" style={{ padding: '1.25rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        {getConcernBadge(clause.concernLevel)}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          PAGE {clause.pageNumber} • {clause.sectionHeading}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {clause.plainExplanation}
                      </h4>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        <strong>Legal term:</strong> {clause.title} ({clause.category?.replace('_', ' ') || 'clause'})
                      </div>
                    </div>

                    <button
                      onClick={() => setExpandedClauseId(isExpanded ? null : clause.id)}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8125rem', padding: '0.35rem 0.65rem' }}
                      aria-expanded={isExpanded}
                    >
                      <span>{isExpanded ? 'Hide Details' : 'View Original Clause'}</span>
                      {isExpanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                    </button>
                  </div>

                  <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-color)' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      <strong>Why it may matter:</strong> {clause.whyItMatters}
                    </p>
                  </div>

                  {isExpanded && (
                    <div
                      style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-muted)',
                        fontSize: '0.875rem',
                        fontFamily: 'monospace',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                      }}
                    >
                      <strong style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
                        Original Contract Excerpt:
                      </strong>
                      "{clause.originalText}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Risk & Attention Findings */}
      {activeTab === 'risks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--amber-bg)',
              color: 'var(--amber-text)',
              fontSize: '0.875rem',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
            }}
          >
            <Info size={18} aria-hidden="true" />
            <span>
              These findings identify potential areas warranting careful review. They do not constitute a determination of legal invalidity.
            </span>
          </div>

          {analysis.findings.map((f) => (
            <div key={f.id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {getConcernBadge(f.category)}
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Source: {f.sourceReference}
                </span>
              </div>

              <h4 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                {f.finding}
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', marginBottom: '1rem' }}>
                <strong>Why it matters:</strong> {f.whyItMatters}
              </p>

              {f.questionsToConsider && f.questionsToConsider.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong style={{ fontSize: '0.875rem', color: 'var(--primary-600)', display: 'block', marginBottom: '0.35rem' }}>
                    Questions to Consider:
                  </strong>
                  <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    {f.questionsToConsider.map((q, idx) => (
                      <li key={idx} style={{ marginBottom: '0.25rem' }}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-muted)',
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <strong>Suggested Professional Follow-up:</strong> {f.suggestedProfessionalFollowUp}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Facts Extracted vs Interpretation */}
      {activeTab === 'facts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--emerald-bg)',
              color: 'var(--emerald-text)',
              fontSize: '0.875rem',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
            }}
          >
            <CheckCircle size={18} aria-hidden="true" />
            <span>
              Explicit factual data points extracted verbatim from the uploaded document without AI interpolation.
            </span>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-card-hover)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Extracted Fact</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Verbatim Excerpt</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Page</th>
                </tr>
              </thead>
              <tbody>
                {analysis.extractedFacts.map((fact, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--primary-600)' }}>
                      {fact.category}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-primary)' }}>
                      {fact.fact}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      "{fact.verbatimExcerpt}"
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                      Page {fact.pageNumber}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
