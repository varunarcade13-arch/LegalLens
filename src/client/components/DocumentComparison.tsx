import React, { useState, useEffect } from 'react';
import {
  GitCompare,
  AlertCircle,
  Sparkles,
  Layers,
  Loader2,
} from 'lucide-react';
import {
  api,
  LegalDocumentDTO,
  ComparisonDTO,
  ClauseDifferenceDTO,
} from '../services/api';

interface DocumentComparisonProps {
  documents: LegalDocumentDTO[];
  onDocumentCreated: () => void;
}

export const DocumentComparison: React.FC<DocumentComparisonProps> = ({
  documents,
  onDocumentCreated,
}) => {
  const [docAId, setDocAId] = useState<string>('');
  const [docBId, setDocBId] = useState<string>('');
  const [comparison, setComparison] = useState<ComparisonDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    if (documents.length >= 2) {
      setDocAId(documents[0].id);
      setDocBId(documents[1].id);
    }
  }, [documents]);

  const handleCompare = async () => {
    if (!docAId || !docBId) {
      setError('Please select two distinct documents to compare.');
      return;
    }
    if (docAId === docBId) {
      setError('Please select two different documents to compare.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await api.compareDocuments(docAId, docBId);
      setComparison(res.comparison);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Comparison failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSampleComparison = async () => {
    setError(null);
    setLoading(true);
    try {
      // Load Vendor V1 and Vendor V2
      const resA = await api.loadDemoTemplate('demo-vendor-v1');
      const resB = await api.loadDemoTemplate('demo-vendor-v2');
      onDocumentCreated();

      setDocAId(resA.document.id);
      setDocBId(resB.document.id);

      const compRes = await api.compareDocuments(resA.document.id, resB.document.id);
      setComparison(compRes.comparison);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load sample comparison';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const getAllDifferences = (comp: ComparisonDTO): ClauseDifferenceDTO[] => {
    const diffs: ClauseDifferenceDTO[] = [];
    if (activeCategory === 'all' || activeCategory === 'added') diffs.push(...comp.addedClauses);
    if (activeCategory === 'all' || activeCategory === 'removed') diffs.push(...comp.removedClauses);
    if (activeCategory === 'all' || activeCategory === 'modified') diffs.push(...comp.modifiedClauses);
    if (activeCategory === 'all' || activeCategory === 'financial') diffs.push(...comp.changedFinancialTerms);
    if (activeCategory === 'all' || activeCategory === 'termination') diffs.push(...comp.changedTermination);
    if (activeCategory === 'all' || activeCategory === 'liability') diffs.push(...comp.changedLiability);
    if (activeCategory === 'all' || activeCategory === 'dispute') diffs.push(...comp.changedDisputeResolution);
    return diffs;
  };

  const getImpactBadge = (level: string) => {
    switch (level) {
      case 'significant':
        return <span className="badge badge-rose">Significant Impact</span>;
      case 'moderate':
        return <span className="badge badge-amber">Moderate Impact</span>;
      case 'low':
      default:
        return <span className="badge badge-sky">Minor Change</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Selector Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              Contract Version & Document Comparison
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Side-by-side analysis of added, removed, and modified clauses between two legal agreements.
            </p>
          </div>
          <button
            onClick={handleLoadSampleComparison}
            disabled={loading}
            className="btn btn-secondary"
            style={{ fontSize: '0.875rem' }}
          >
            <Sparkles size={16} style={{ color: 'var(--primary-600)' }} aria-hidden="true" />
            <span>Load Sample Comparison (V1 vs V2)</span>
          </button>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--rose-bg)',
              color: 'var(--rose-text)',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={18} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {documents.length < 2 ? (
          <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-app)', borderRadius: 'var(--radius-sm)' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              You need at least two documents in your account to perform a comparison.
            </p>
            <button onClick={handleLoadSampleComparison} className="btn btn-primary">
              <Sparkles size={16} aria-hidden="true" />
              <span>Load 2024 vs 2025 Vendor Agreements</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-muted)' }}>
                DOCUMENT A (BASELINE)
              </label>
              <select
                value={docAId}
                onChange={(e) => setDocAId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                }}
              >
                {documents.map((d, idx) => (
                  <option key={`a-${d.id}-${idx}`} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ paddingTop: '1.25rem' }}>
              <GitCompare size={24} style={{ color: 'var(--primary-600)' }} aria-hidden="true" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-muted)' }}>
                DOCUMENT B (COMPARISON / REVISED)
              </label>
              <select
                value={docBId}
                onChange={(e) => setDocBId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                }}
              >
                {documents.map((d, idx) => (
                  <option key={`b-${d.id}-${idx}`} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {documents.length >= 2 && (
          <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
            <button
              onClick={handleCompare}
              disabled={loading}
              className="btn btn-primary"
              style={{ minWidth: '160px' }}
            >
              {loading ? (
                <>
                  <Loader2
                    size={16}
                    className="spinner animate-spin"
                    style={{
                      animation: 'spin 0.85s linear infinite',
                      WebkitAnimation: 'spin 0.85s linear infinite',
                      display: 'inline-block',
                    }}
                    aria-hidden="true"
                  />
                  <span>Analyzing Diffs...</span>
                </>
              ) : (
                <>
                  <GitCompare size={16} aria-hidden="true" />
                  <span>Compare Documents</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Comparison Results */}
      {comparison && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Executive Summary */}
          <div
            className="card"
            style={{
              background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-card-hover) 100%)',
              borderLeft: '4px solid var(--primary-600)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge badge-emerald">Executive Summary of Differences</span>
              <span className="badge badge-sky">AI Provider: Gemini</span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {comparison.documentATitle} vs {comparison.documentBTitle}
              </span>
            </div>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {comparison.executiveSummary}
            </p>
          </div>

          {/* Category Filter */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Differences' },
              { id: 'financial', label: 'Financial & Fees' },
              { id: 'liability', label: 'Liability & Risk' },
              { id: 'termination', label: 'Termination & Notice' },
              { id: 'dispute', label: 'Dispute Resolution' },
              { id: 'added', label: 'Added Terms' },
              { id: 'removed', label: 'Removed Terms' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`btn ${activeCategory === cat.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem' }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Side by Side Diff Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {getAllDifferences(comparison).map((diff, idx) => (
              <div key={idx} className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Layers size={18} style={{ color: 'var(--primary-600)' }} aria-hidden="true" />
                    <strong style={{ fontSize: '1.1rem' }}>{diff.category}</strong>
                  </div>
                  {getImpactBadge(diff.impactLevel)}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                      DOCUMENT A ({comparison.documentATitle})
                    </span>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      {diff.documentA}
                    </p>
                  </div>

                  <div
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--primary-50)',
                      border: '1px solid var(--primary-100)',
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-600)', display: 'block', marginBottom: '0.35rem' }}>
                      DOCUMENT B ({comparison.documentBTitle})
                    </span>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {diff.documentB}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-card-hover)',
                    borderLeft: '3px solid var(--amber-badge)',
                  }}
                >
                  <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                    Difference & Practical Impact:
                  </strong>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    {diff.difference}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <strong>Why it matters:</strong> {diff.whyItMatters}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
