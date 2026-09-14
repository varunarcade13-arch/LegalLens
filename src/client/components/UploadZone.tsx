import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { api, LegalDocumentDTO, DemoTemplateDTO } from '../services/api';

interface UploadZoneProps {
  onDocumentUploaded: (doc: LegalDocumentDTO) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onDocumentUploaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<DemoTemplateDTO[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await api.getDemoTemplates();
      setTemplates(res.templates);
    } catch {
      // ignore
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    const ext = file.name.toLowerCase().split('.').pop();
    if (!['pdf', 'docx', 'txt'].includes(ext || '')) {
      setError('Unsupported file type. Please upload a PDF, DOCX, or TXT legal document.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('File is too large. Maximum size is 15MB.');
      return;
    }

    setUploading(true);
    setStage('Uploading file securely...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name.replace(/\.[^/.]+$/, ''));

      setStage('Parsing contract structure...');
      const res = await api.uploadDocument(formData);

      setStage('Indexing clauses & generating analysis...');
      await api.analyzeDocument(res.document.id);

      onDocumentUploaded(res.document);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
    } finally {
      setUploading(false);
      setStage('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleLoadDemo = async (templateId: string) => {
    setError(null);
    setUploading(true);
    setStage('Loading and analyzing fictional demo contract...');

    try {
      const res = await api.loadDemoTemplate(templateId);
      onDocumentUploaded(res.document);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load demo';
      setError(msg);
    } finally {
      setUploading(false);
      setStage('');
    }
  };

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      {error && (
        <div
          role="alert"
          style={{
            padding: '1rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--rose-bg)',
            color: 'var(--rose-text)',
            border: '1px solid var(--rose-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            marginBottom: '1rem',
          }}
        >
          <AlertCircle size={20} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Drag and Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        aria-label="Upload legal document"
        style={{
          border: `2px dashed ${isDragging ? 'var(--primary-600)' : 'var(--border-color)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '3rem 2rem',
          textAlign: 'center',
          background: isDragging ? 'var(--primary-50)' : 'var(--bg-card)',
          cursor: uploading ? 'wait' : 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: isDragging ? 'var(--shadow-glow)' : 'var(--shadow-sm)',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
          disabled={uploading}
        />

        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Loader2 size={40} className="spinner" style={{ color: 'var(--primary-600)', animation: 'spin 1s linear infinite' }} aria-hidden="true" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{stage}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Treating document as untrusted data, isolating user scope, and structuring plain-language summaries.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '3.75rem',
                height: '3.75rem',
                borderRadius: 'var(--radius-full)',
                background: 'var(--primary-50)',
                color: 'var(--primary-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UploadCloud size={28} aria-hidden="true" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.5rem' }}>
              Drag and drop your legal contract here
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '480px' }}>
              Upload any PDF, DOCX, or TXT contract (up to 15MB). We never use your document to train public AI models.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <span className="badge badge-sky">PDF</span>
              <span className="badge badge-sky">DOCX</span>
              <span className="badge badge-sky">TXT</span>
            </div>
          </div>
        )}
      </div>

      {/* Demo Contract Quick Loader */}
      <div style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Sparkles size={16} style={{ color: 'var(--primary-600)' }} aria-hidden="true" />
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Need a contract to test? Try one of our realistic fictional demo documents:
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => handleLoadDemo(tpl.id)}
              disabled={uploading}
              className="btn btn-secondary"
              style={{ fontSize: '0.8125rem', padding: '0.45rem 0.85rem' }}
            >
              <FileText size={14} style={{ color: 'var(--primary-600)' }} aria-hidden="true" />
              <span>{tpl.title.replace(' (Sample)', '')}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
