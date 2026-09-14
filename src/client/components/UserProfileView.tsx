import React, { useState } from 'react';
import { User, Shield, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SanitizedUser, api } from '../services/api';

interface UserProfileViewProps {
  user: SanitizedUser;
  documentCount: number;
  onAccountDeleted: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  user,
  documentCount,
  onAccountDeleted,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    setError(null);
    setDeleting(true);
    try {
      await api.deleteAccount();
      onAccountDeleted();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Account deletion failed';
      setError(msg);
      setDeleting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '3.5rem',
              height: '3.5rem',
              borderRadius: 'var(--radius-full)',
              background: 'var(--primary-50)',
              color: 'var(--primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <User size={28} aria-hidden="true" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{user.name}</h2>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{user.email}</span>
          </div>
        </div>

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
              ACCOUNT ID
            </span>
            <code style={{ fontSize: '0.8125rem' }}>{user.id}</code>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>
              DOCUMENTS STORED
            </span>
            <strong>{documentCount} active contract(s)</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>
              MEMBER SINCE
            </span>
            <span>{new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Privacy & Security Guarantees */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Shield size={20} style={{ color: 'var(--emerald-badge)' }} aria-hidden="true" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Privacy & Data Protection</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <CheckCircle2 size={16} style={{ color: 'var(--emerald-badge)', flexShrink: 0, marginTop: '3px' }} aria-hidden="true" />
            <span>
              <strong>Per-User Isolation:</strong> All uploaded contracts, embeddings, and chat histories are bound strictly to your unique account ID with database-level isolation.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <CheckCircle2 size={16} style={{ color: 'var(--emerald-badge)', flexShrink: 0, marginTop: '3px' }} aria-hidden="true" />
            <span>
              <strong>No Public Model Training:</strong> Your legal agreements are never submitted for training public foundation models.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <CheckCircle2 size={16} style={{ color: 'var(--emerald-badge)', flexShrink: 0, marginTop: '3px' }} aria-hidden="true" />
            <span>
              <strong>Prompt Injection Defenses:</strong> Documents are encapsulated in isolated boundary blocks to neutralize adversarial tampering.
            </span>
          </div>
        </div>
      </div>

      {/* Danger Zone: Account Deletion */}
      <div className="card" style={{ borderColor: 'var(--rose-border)', background: 'var(--rose-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--rose-text)' }}>
          <AlertTriangle size={20} aria-hidden="true" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Danger Zone: Delete Account</h3>
        </div>

        <p style={{ fontSize: '0.875rem', color: 'var(--rose-text)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          Permanently delete your account and all associated documents, analyses, vector embeddings, chat logs, and comparison reports. This action cannot be undone.
        </p>

        {error && (
          <div style={{ padding: '0.5rem', marginBottom: '1rem', color: 'var(--rose-text)', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {confirmDelete ? (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="btn btn-danger"
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              {deleting ? 'Deleting permanently...' : 'Yes, Delete Everything'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="btn btn-danger"
            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          >
            <Trash2 size={15} aria-hidden="true" />
            <span>Delete Account & Data</span>
          </button>
        )}
      </div>
    </div>
  );
};
