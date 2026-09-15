import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  Copy,
  Check,
  Bot,
  User as UserIcon,
  FileText,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Trash2,
  Loader2,
} from 'lucide-react';
import { api, ChatMessageDTO, LegalDocumentDTO } from '../services/api';

interface ChatInterfaceProps {
  document: LegalDocumentDTO;
  onBack?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ document, onBack }) => {
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({});

  const loadingSteps = [
    'Searching your document...',
    'Finding relevant sections...',
    'Generating grounded response with Gemini...',
  ];

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading) {
      setLoadingStep(0);
      return;
    }
    const timer = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % 3);
    }, 1200);
    return () => clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    loadChat();
  }, [document.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadChat = async () => {
    try {
      const res = await api.getChatHistory(document.id);
      setMessages(res.messages);
    } catch {
      // ignore
    }
  };

  const handleSend = async (qText?: string) => {
    const textToSend = qText || question;
    if (!textToSend.trim() || loading) return;

    const userQuestion = textToSend.trim();
    setQuestion('');
    setLoading(true);

    // Optimistic user message
    const tempUserMsg: ChatMessageDTO = {
      id: `temp_${Date.now()}`,
      userId: document.userId,
      documentId: document.id,
      role: 'user',
      content: userQuestion,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await api.askChat(document.id, userQuestion);
      setMessages((prev) => [...prev.filter((m) => m.id !== tempUserMsg.id), tempUserMsg, res.message]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve answer';
      const errorAssistantMsg: ChatMessageDTO = {
        id: `err_${Date.now()}`,
        userId: document.userId,
        documentId: document.id,
        role: 'assistant',
        content: `Error: ${msg}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorAssistantMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Clear all conversation history for this document?')) return;
    try {
      await api.clearChatHistory(document.id);
      setMessages([]);
    } catch {
      // ignore
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleCitations = (id: string) => {
    setExpandedCitations((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const suggestedQuestions = [
    'What happens if I terminate this agreement early?',
    'How much written notice do I need to provide?',
    'Who owns the intellectual property created during this agreement?',
    'What are my financial and payment obligations?',
    'What should I specifically ask my lawyer about this contract?',
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 12rem)',
        minHeight: '600px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-card-hover)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {onBack && (
            <button onClick={onBack} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem' }}>
              Back
            </button>
          )}
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
              Grounded AI Legal Companion
            </h3>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Source: <strong>{document.title}</strong> • Verified against document chunks
            </span>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="btn btn-secondary"
            style={{ fontSize: '0.8125rem', padding: '0.35rem 0.65rem' }}
            aria-label="Clear chat history"
          >
            <Trash2 size={14} aria-hidden="true" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div
        style={{
          flexGrow: 1,
          overflowY: 'auto',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
        role="log"
        aria-live="polite"
        aria-label="Conversation with LegalLens AI"
      >
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', margin: 'auto', maxWidth: '600px', padding: '2rem' }}>
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
                margin: '0 auto 1rem',
              }}
            >
              <Sparkles size={24} aria-hidden="true" />
            </div>
            <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Ask anything about "{document.title}"
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', marginBottom: '1.5rem' }}>
              Every answer is retrieved and grounded directly in the text of your document. If something is not in the contract, the AI will explicitly let you know.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                SUGGESTED QUESTIONS:
              </span>
              {suggestedQuestions.map((sq, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(sq)}
                  className="btn btn-secondary"
                  style={{
                    textAlign: 'left',
                    justifyContent: 'flex-start',
                    fontSize: '0.875rem',
                    padding: '0.6rem 0.85rem',
                  }}
                >
                  <HelpCircle size={15} style={{ color: 'var(--primary-600)', flexShrink: 0 }} aria-hidden="true" />
                  <span>{sq}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              gap: '0.75rem',
              maxWidth: '850px',
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              width: '100%',
            }}
          >
            <div
              style={{
                width: '2.25rem',
                height: '2.25rem',
                borderRadius: 'var(--radius-full)',
                background: msg.role === 'user' ? 'var(--primary-600)' : 'var(--bg-muted)',
                color: msg.role === 'user' ? '#ffffff' : 'var(--primary-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {msg.role === 'user' ? <UserIcon size={16} aria-hidden="true" /> : <Bot size={18} aria-hidden="true" />}
            </div>

            <div
              style={{
                flexGrow: 1,
                background: msg.role === 'user' ? 'var(--primary-50)' : 'var(--bg-card)',
                border: `1px solid ${msg.role === 'user' ? 'var(--primary-100)' : 'var(--border-color)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {msg.role === 'user' ? (
                <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {msg.content}
                </p>
              ) : msg.structuredAnswer ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Short answer */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className="badge badge-emerald">
                          Short Answer
                        </span>
                        <span className="badge badge-sky">
                          AI Provider: {msg.structuredAnswer.aiProvider || 'Gemini'}
                        </span>
                        {msg.structuredAnswer.grounded ? (
                          <span className="badge badge-emerald">
                            Grounded in {msg.structuredAnswer.sourceCitations.length} section(s)
                            {msg.structuredAnswer.groundingConfidence !== undefined && ` • ${Math.round(msg.structuredAnswer.groundingConfidence * 100)}% Confidence`}
                          </span>
                        ) : (
                          <span className="badge badge-amber">
                            Not Grounded in Document
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => copyToClipboard(msg.structuredAnswer!.shortAnswer, msg.id)}
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        aria-label="Copy answer"
                      >
                        {copiedId === msg.id ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                        <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {msg.structuredAnswer.shortAnswer}
                    </p>
                  </div>

                  {/* What the document says */}
                  <div style={{ padding: '0.75rem', background: 'var(--bg-muted)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      WHAT THE DOCUMENT SAYS:
                    </span>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {msg.structuredAnswer.whatTheDocumentSays}
                    </p>
                  </div>

                  {/* Why it matters */}
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-600)', display: 'block', marginBottom: '0.25rem' }}>
                      WHY THIS MATTERS:
                    </span>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {msg.structuredAnswer.whyItMatters}
                    </p>
                  </div>

                  {/* Source Citations */}
                  {msg.structuredAnswer.sourceCitations && msg.structuredAnswer.sourceCitations.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                      <button
                        onClick={() => toggleCitations(msg.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          color: 'var(--primary-600)',
                        }}
                        aria-expanded={!!expandedCitations[msg.id]}
                      >
                        <FileText size={14} aria-hidden="true" />
                        <span>
                          {msg.structuredAnswer.sourceCitations.length} Document Source Citation(s)
                        </span>
                        {expandedCitations[msg.id] ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                      </button>

                      {expandedCitations[msg.id] && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {msg.structuredAnswer.sourceCitations.map((cit, cIdx) => (
                            <div
                              key={cIdx}
                              style={{
                                padding: '0.65rem',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg-app)',
                                border: '1px solid var(--border-color)',
                                fontSize: '0.8125rem',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                <strong>Page {cit.pageNumber}</strong>
                                <span style={{ color: 'var(--text-muted)' }}>{cit.sectionHeading}</span>
                              </div>
                              <p style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                "{cit.textSnippet}"
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Questions for a lawyer */}
                  {msg.structuredAnswer.questionsForLawyer && msg.structuredAnswer.questionsForLawyer.length > 0 && (
                    <div
                      style={{
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--amber-bg)',
                        border: '1px solid var(--amber-border)',
                      }}
                    >
                      <strong style={{ fontSize: '0.8125rem', color: 'var(--amber-text)', display: 'block', marginBottom: '0.35rem' }}>
                        Suggested Questions to Discuss with a Lawyer:
                      </strong>
                      <ul style={{ paddingLeft: '1.25rem', color: 'var(--amber-text)', fontSize: '0.8125rem' }}>
                        {msg.structuredAnswer.questionsForLawyer.map((q, qIdx) => (
                          <li key={qIdx} style={{ marginBottom: '0.2rem' }}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={18} className="spinner" aria-hidden="true" />
            <span style={{ fontSize: '0.875rem' }}>{loadingSteps[loadingStep]}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          style={{ display: 'flex', gap: '0.75rem' }}
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={loading}
            placeholder="Ask a question about this contract (e.g. 'Can this renew automatically?')..."
            style={{
              flexGrow: 1,
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-app)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="btn btn-primary"
            style={{ padding: '0.75rem 1.5rem' }}
          >
            <Send size={16} aria-hidden="true" />
            <span>Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
};
