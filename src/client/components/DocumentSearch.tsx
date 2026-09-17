import React, { useState } from 'react';
import { Search as SearchIcon, X, FileText, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface SearchResultItem {
  chunkId: string;
  pageNumber: number;
  sectionHeading: string;
  matchedSnippet: string;
}

interface DocumentSearchProps {
  documentId: string;
  documentTitle: string;
  onBack: () => void;
}

export const DocumentSearch: React.FC<DocumentSearchProps> = ({
  documentId,
  documentTitle,
  onBack,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    try {
      const res = await api.searchDocument(documentId, query.trim());
      setResults(res.results);
      setCurrentIndex(0);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const highlightMatches = (text: string, term: string) => {
    if (!term) return text;
    const parts = text.split(new RegExp(`(${term})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === term.toLowerCase() ? (
        <mark
          key={i}
          style={{
            background: 'var(--amber-border)',
            color: 'var(--amber-text)',
            padding: '0 2px',
            borderRadius: '2px',
            fontWeight: 600,
          }}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button onClick={onBack} className="btn btn-secondary" style={{ padding: '0.45rem 0.75rem' }}>
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to Analysis</span>
        </button>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
          Search Document: {documentTitle}
        </h2>
      </div>

      <div className="card">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ position: 'relative', flexGrow: 1 }}>
            <SearchIcon
              size={18}
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clauses, terms, numbers, obligations (e.g. 'arbitration', '30 days', 'indemnify')..."
              style={{
                width: '100%',
                padding: '0.75rem 2.25rem 0.75rem 2.5rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-app)',
                color: 'var(--text-primary)',
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                }}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
                aria-label="Clear search"
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={searching}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {searching && <Loader2 size={16} className="spinner animate-spin" aria-hidden="true" />}
            <span>{searching ? 'Searching...' : 'Search'}</span>
          </button>
        </form>

        {results.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '1rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-color)',
              fontSize: '0.875rem',
            }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>
              Found <strong>{results.length}</strong> matching sections
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>
                {currentIndex + 1} of {results.length}
              </span>
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem' }}
                aria-label="Previous match"
              >
                <ArrowLeft size={14} aria-hidden="true" />
              </button>
              <button
                disabled={currentIndex === results.length - 1}
                onClick={() => setCurrentIndex((prev) => Math.min(results.length - 1, prev + 1))}
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem' }}
                aria-label="Next match"
              >
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>

      {results.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {results.map((res, idx) => {
            const isCurrent = idx === currentIndex;
            return (
              <div
                key={res.chunkId}
                className="card"
                style={{
                  borderColor: isCurrent ? 'var(--primary-600)' : 'var(--border-color)',
                  background: isCurrent ? 'var(--primary-50)' : 'var(--bg-card)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={16} style={{ color: 'var(--primary-600)' }} aria-hidden="true" />
                    <strong style={{ fontSize: '0.95rem' }}>{res.sectionHeading}</strong>
                  </div>
                  <span className="badge badge-sky" style={{ fontSize: '0.7rem' }}>
                    PAGE {res.pageNumber}
                  </span>
                </div>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                  {highlightMatches(res.matchedSnippet, query)}
                </p>
              </div>
            );
          })}
        </div>
      ) : query && !searching ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            No occurrences of "<strong>{query}</strong>" were found in this document.
          </p>
        </div>
      ) : null}
    </div>
  );
};
