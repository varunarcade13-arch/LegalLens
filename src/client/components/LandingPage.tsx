import React from 'react';
import {
  ShieldCheck,
  FileSearch,
  MessageSquareText,
  GitCompare,
  CheckSquare,
  Lock,
  ArrowRight,
  FileCheck2,
  AlertTriangle,
  Briefcase,
  Home,
  Cloud,
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onTryDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onTryDemo }) => {
  return (
    <div>
      {/* Hero Section */}
      <section
        style={{
          padding: '5rem 0 4rem',
          background: 'linear-gradient(180deg, var(--bg-card) 0%, var(--bg-app) 100%)',
          borderBottom: '1px solid var(--border-subtle)',
          textAlign: 'center',
        }}
      >
        <div className="app-container" style={{ maxWidth: '900px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 1rem',
              borderRadius: 'var(--radius-full)',
              background: 'var(--primary-50)',
              color: 'var(--primary-600)',
              fontSize: '0.875rem',
              fontWeight: 600,
              marginBottom: '1.5rem',
              border: '1px solid var(--primary-100)',
            }}
          >
            <ShieldCheck size={16} aria-hidden="true" />
            <span>AI for Legal Assistance & Document Transparency</span>
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              marginBottom: '1.5rem',
              color: 'var(--text-primary)',
            }}
          >
            Understand legal documents <br />
            <span
              style={{
                background: 'linear-gradient(135deg, var(--primary-600), #818cf8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              before you sign them.
            </span>
          </h1>

          <p
            style={{
              fontSize: '1.25rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: '2.5rem',
              maxWidth: '750px',
              marginInline: 'auto',
            }}
          >
            Use AI to simplify, analyze, compare, and prepare questions about legal documents — in plain language. Never feel lost in complex legalese again.
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
              marginBottom: '2.5rem',
            }}
          >
            <button
              onClick={onGetStarted}
              className="btn btn-primary"
              style={{ padding: '0.85rem 1.75rem', fontSize: '1.05rem' }}
            >
              <span>Get Started Free</span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            <button
              onClick={onTryDemo}
              className="btn btn-secondary"
              style={{ padding: '0.85rem 1.75rem', fontSize: '1.05rem' }}
            >
              <FileCheck2 size={18} aria-hidden="true" />
              <span>Explore Fictional Demo</span>
            </button>
          </div>

          {/* Trust Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2rem',
              flexWrap: 'wrap',
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Lock size={15} style={{ color: 'var(--emerald-badge)' }} aria-hidden="true" />
              Strict Per-User Document Isolation
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={15} style={{ color: 'var(--emerald-badge)' }} aria-hidden="true" />
              Grounding & Citation Verification
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AlertTriangle size={15} style={{ color: 'var(--amber-badge)' }} aria-hidden="true" />
              Informational Assistance, Not Legal Advice
            </span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '4.5rem 0', background: 'var(--bg-app)' }}>
        <div className="app-container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                fontWeight: 700,
                marginBottom: '0.75rem',
              }}
            >
              How LegalLens Works
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
              The end-to-end journey from raw legal contract to plain-English clarity and action.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {[
              {
                step: '01',
                title: 'Upload Securely',
                desc: 'Upload PDF, DOCX, or TXT documents. Files are validated, parsed, and indexed into your private workspace.',
                icon: FileCheck2,
              },
              {
                step: '02',
                title: 'Plain-Language Translation',
                desc: 'Complex legal phrasing is translated into simple language: what you agree to, your rights, and responsibilities.',
                icon: FileSearch,
              },
              {
                step: '03',
                title: 'Grounded AI Q&A',
                desc: 'Ask questions about termination, liability, or fees. Get answers backed by exact page and section citations.',
                icon: MessageSquareText,
              },
              {
                step: '04',
                title: 'Compare & Take Action',
                desc: 'Compare document versions side-by-side and export actionable checklists to take directly to your lawyer.',
                icon: CheckSquare,
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="card" style={{ position: 'relative' }}>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: 'var(--primary-600)',
                      letterSpacing: '0.05em',
                      marginBottom: '0.75rem',
                    }}
                  >
                    STEP {item.step}
                  </div>
                  <div
                    style={{
                      width: '2.75rem',
                      height: '2.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--primary-50)',
                      color: 'var(--primary-600)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1rem',
                    }}
                  >
                    <Icon size={22} aria-hidden="true" />
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)' }}>
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section
        style={{
          padding: '4.5rem 0',
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="app-container">
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                fontWeight: 700,
                marginBottom: '0.75rem',
              }}
            >
              Comprehensive Legal Document Companion
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
              Built specifically for non-lawyers facing important contracts.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '2rem',
            }}
          >
            <div className="card">
              <div className="badge badge-emerald" style={{ marginBottom: '1rem' }}>
                Clarity & Access
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                Plain-Language Summaries
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1rem' }}>
                Instead of confusing legal terms, see straightforward summaries:
              </p>
              <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <li style={{ marginBottom: '0.35rem' }}>What this document is about</li>
                <li style={{ marginBottom: '0.35rem' }}>What you are agreeing to</li>
                <li style={{ marginBottom: '0.35rem' }}>What the other party is agreeing to</li>
                <li style={{ marginBottom: '0.35rem' }}>Financial & payment responsibilities</li>
                <li>Clear distinction between facts and AI interpretation</li>
              </ul>
            </div>

            <div className="card">
              <div className="badge badge-amber" style={{ marginBottom: '1rem' }}>
                Risk & Attention
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                Important Clause Detection
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1rem' }}>
                Identifies critical provisions across 18 legal categories:
              </p>
              <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <li style={{ marginBottom: '0.35rem' }}>Indemnification & liability caps</li>
                <li style={{ marginBottom: '0.35rem' }}>Termination & auto-renewal windows</li>
                <li style={{ marginBottom: '0.35rem' }}>Non-compete & IP assignment</li>
                <li style={{ marginBottom: '0.35rem' }}>Mandatory arbitration & venue</li>
                <li>Traceable directly back to original page and section</li>
              </ul>
            </div>

            <div className="card">
              <div className="badge badge-sky" style={{ marginBottom: '1rem' }}>
                Side-by-Side Analysis
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                Contract Comparison
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1rem' }}>
                Compare two versions of an agreement (e.g. 2024 vs 2025 terms):
              </p>
              <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <li style={{ marginBottom: '0.35rem' }}>Added and removed clauses</li>
                <li style={{ marginBottom: '0.35rem' }}>Changed financial and payment terms</li>
                <li style={{ marginBottom: '0.35rem' }}>Altered notice and termination deadlines</li>
                <li style={{ marginBottom: '0.35rem' }}>Modified risk and liability allocation</li>
                <li>Clear explanations of why differences matter</li>
              </ul>
            </div>

            <div className="card">
              <div className="badge badge-rose" style={{ marginBottom: '1rem' }}>
                Lawyer Collaboration
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                Actionable Lawyer Briefing
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1rem' }}>
                Prepare for attorney consultations with zero wasted time:
              </p>
              <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <li style={{ marginBottom: '0.35rem' }}>Key questions to ask your lawyer</li>
                <li style={{ marginBottom: '0.35rem' }}>Checklist of documents and evidence to bring</li>
                <li style={{ marginBottom: '0.35rem' }}>Critical deadlines and renewal milestones</li>
                <li style={{ marginBottom: '0.35rem' }}>Interactive checkable action items</li>
                <li>One-click export to Markdown or printable briefing</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Example Use Cases */}
      <section style={{ padding: '4.5rem 0', background: 'var(--bg-app)' }}>
        <div className="app-container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                fontWeight: 700,
                marginBottom: '0.75rem',
              }}
            >
              Realistic Demo Documents Available
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
              Experience the full capabilities instantly with realistic fictional agreements.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {[
              {
                title: 'Employment Agreement',
                category: 'Employment',
                desc: 'Executive offer letter with bonus terms, non-compete restrictions, and IP assignment.',
                icon: Briefcase,
              },
              {
                title: 'Residential Lease Agreement',
                category: 'Tenancy',
                desc: 'Standard residential lease with security deposits, late charges, and automatic renewal.',
                icon: Home,
              },
              {
                title: 'Enterprise SaaS Agreement',
                category: 'Technology',
                desc: 'Cloud subscription agreement with SLA uptime, liability caps, and data privacy commitments.',
                icon: Cloud,
              },
              {
                title: 'Vendor Contract Comparison',
                category: 'Comparison',
                desc: 'Two versions of a logistics master services agreement with altered liability caps and notice terms.',
                icon: GitCompare,
              },
            ].map((demo, idx) => {
              const Icon = demo.icon;
              return (
                <div key={idx} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div
                      style={{
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--primary-50)',
                        color: 'var(--primary-600)',
                      }}
                    >
                      <Icon size={20} aria-hidden="true" />
                    </div>
                    <div>
                      <span className="badge badge-sky" style={{ fontSize: '0.65rem' }}>
                        {demo.category}
                      </span>
                    </div>
                  </div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    {demo.title}
                  </h4>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', flexGrow: 1, marginBottom: '1rem' }}>
                    {demo.desc}
                  </p>
                  <button
                    onClick={onTryDemo}
                    className="btn btn-outline"
                    style={{ fontSize: '0.875rem', width: '100%' }}
                  >
                    <span>Try with Sample Contract</span>
                    <ArrowRight size={14} aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer / Legal Boundary */}
      <footer
        style={{
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--border-color)',
          padding: '3rem 0 2rem',
          fontSize: '0.875rem',
          color: 'var(--text-muted)',
        }}
      >
        <div className="app-container">
          <div
            style={{
              padding: '1.5rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--amber-bg)',
              border: '1px solid var(--amber-border)',
              color: 'var(--amber-text)',
              marginBottom: '2rem',
            }}
          >
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
              <div>
                <strong style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.95rem' }}>
                  Important Legal Boundary & Regulatory Notice
                </strong>
                <p style={{ lineHeight: 1.5, fontSize: '0.85rem' }}>
                  LegalLens is an AI-powered document companion providing automated text extraction, plain-language translation, and analytical summaries for informational assistance. LegalLens is <strong>not a law firm, does not provide formal legal advice, and does not establish an attorney-client relationship</strong>. Always consult a qualified, licensed attorney in your jurisdiction before executing, terminating, or making legal determinations regarding binding contracts.
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <strong>LegalLens</strong> — AI for Legal Assistance & Access. All rights reserved.
            </div>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <span>Privacy-First Architecture</span>
              <span>100% Verified Test Coverage</span>
              <span>WCAG 2.2 AA Accessible</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
