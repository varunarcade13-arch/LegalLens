import React, { useState } from 'react';
import { ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';

export const LegalDisclaimerBanner: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      aria-label="Legal information disclaimer"
      style={{
        background: 'var(--amber-bg)',
        borderBottom: '1px solid var(--amber-border)',
        color: 'var(--amber-text)',
        padding: '0.65rem 1rem',
        fontSize: '0.875rem',
      }}
    >
      <div
        className="app-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <ShieldAlert size={18} style={{ color: 'var(--amber-badge)', flexShrink: 0 }} aria-hidden="true" />
          <span>
            <strong>Legal Information Notice:</strong> LegalLens provides automated document assistance and informational analysis. It does <strong>not</strong> provide legal advice and is not a substitute for a qualified lawyer.
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--amber-text)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.8125rem',
            fontWeight: 600,
          }}
          aria-expanded={expanded}
          aria-controls="disclaimer-details"
        >
          {expanded ? 'Hide Details' : 'Learn More'}
          {expanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
        </button>
      </div>

      {expanded && (
        <div
          id="disclaimer-details"
          className="app-container"
          style={{
            marginTop: '0.5rem',
            paddingTop: '0.5rem',
            borderTop: '1px dashed var(--amber-border)',
            fontSize: '0.8125rem',
            lineHeight: 1.5,
          }}
        >
          <p>
            Generative AI outputs are probabilistic summaries intended to help you navigate contract clauses, detect areas warranting professional review, and prepare structured questions for your attorney. Laws and judicial interpretations vary significantly by state and country. Always seek the advice of licensed legal counsel for binding agreements.
          </p>
        </div>
      )}
    </aside>
  );
};
