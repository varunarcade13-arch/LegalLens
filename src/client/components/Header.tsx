import React from 'react';
import {
  Scale,
  LayoutDashboard,
  FileText,
  GitCompare,
  MessageSquare,
  ClipboardList,
  User as UserIcon,
  HelpCircle,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';
import { SanitizedUser } from '../services/api';

export type ActiveTab =
  | 'dashboard'
  | 'documents'
  | 'compare'
  | 'chat'
  | 'briefings'
  | 'profile'
  | 'help';

interface HeaderProps {
  user: SanitizedUser | null;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeTab,
  onSelectTab,
  onOpenAuth,
  onLogout,
  theme,
  onToggleTheme,
}) => {
  return (
    <header
      style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-color)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        className="app-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '4rem',
        }}
      >
        {/* Brand */}
        <div
          onClick={() => onSelectTab(user ? 'dashboard' : 'help')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onSelectTab(user ? 'dashboard' : 'help');
          }}
          aria-label="LegalLens Home"
        >
          <div
            style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, var(--primary-600), #818cf8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <Scale size={22} aria-hidden="true" />
          </div>
          <div>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '1.25rem',
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
              }}
            >
              Legal<span style={{ color: 'var(--primary-600)' }}>Lens</span>
            </span>
            <span
              style={{
                display: 'block',
                fontSize: '0.6875rem',
                color: 'var(--text-muted)',
                fontWeight: 500,
                letterSpacing: '0.02em',
              }}
            >
              Document Companion
            </span>
          </div>
        </div>

        {/* Navigation */}
        {user ? (
          <nav aria-label="Main Navigation" style={{ display: 'flex', gap: '0.25rem' }}>
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.875rem' }}
              aria-current={activeTab === 'dashboard' ? 'page' : undefined}
            >
              <LayoutDashboard size={16} aria-hidden="true" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => onSelectTab('documents')}
              className={`btn ${activeTab === 'documents' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.875rem' }}
              aria-current={activeTab === 'documents' ? 'page' : undefined}
            >
              <FileText size={16} aria-hidden="true" />
              <span>My Documents</span>
            </button>
            <button
              onClick={() => onSelectTab('compare')}
              className={`btn ${activeTab === 'compare' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.875rem' }}
              aria-current={activeTab === 'compare' ? 'page' : undefined}
            >
              <GitCompare size={16} aria-hidden="true" />
              <span>Compare</span>
            </button>
            <button
              onClick={() => onSelectTab('chat')}
              className={`btn ${activeTab === 'chat' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.875rem' }}
              aria-current={activeTab === 'chat' ? 'page' : undefined}
            >
              <MessageSquare size={16} aria-hidden="true" />
              <span>Ask AI</span>
            </button>
            <button
              onClick={() => onSelectTab('briefings')}
              className={`btn ${activeTab === 'briefings' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.875rem' }}
              aria-current={activeTab === 'briefings' ? 'page' : undefined}
            >
              <ClipboardList size={16} aria-hidden="true" />
              <span>Briefings</span>
            </button>
          </nav>
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => onSelectTab('help')}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.875rem' }}
            >
              <HelpCircle size={16} aria-hidden="true" />
              <span>About & Vision</span>
            </button>
          </div>
        )}

        {/* User Menu & Theme Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            onClick={onToggleTheme}
            className="btn btn-secondary"
            style={{ padding: '0.5rem', borderRadius: 'var(--radius-full)' }}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          >
            {theme === 'light' ? <Moon size={17} aria-hidden="true" /> : <Sun size={17} aria-hidden="true" />}
          </button>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => onSelectTab('profile')}
                className="btn btn-secondary"
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.875rem' }}
                aria-label="User Profile"
              >
                <UserIcon size={16} aria-hidden="true" />
                <span>{user.name.split(' ')[0]}</span>
              </button>
              <button
                onClick={onLogout}
                className="btn btn-secondary"
                style={{ padding: '0.45rem 0.65rem' }}
                aria-label="Log Out"
                title="Log Out"
              >
                <LogOut size={16} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="btn btn-primary"
              style={{ padding: '0.45rem 1rem', fontSize: '0.875rem' }}
            >
              Sign In / Register
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
