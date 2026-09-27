'use client';

import { useChat } from '@ai-sdk/react';
import ReactMarkdown from 'react-markdown';

type Source = { text?: string; source?: string; document?: string; section?: string; score?: number };

const SCOPE_LABELS: Record<string, string> = {
  acme: 'Acme docs',
  standards: 'Standards',
  both: 'Acme docs + standards',
};

export default function Page() {
  const { messages, input, setInput, setMessages, handleInputChange, handleSubmit, status, error } = useChat({
    api: '/api/chat',
  });
  const isBusy = status === 'streaming' || status === 'submitted';
  const suggestions = [
    'How does OAuth2 authentication work?',
    'What limits apply to API keys?',
    'How should I handle a 429 response?',
    'What does the OAuth 2.0 standard say about the client credentials grant?',
  ];

  return (
    <main className="guide-shell">
      <aside className="guide-rail" aria-label="Field guide navigation">
        <a className="brand-lockup" href="#top" aria-label="Acme API Field Guide home">
          <span className="brand-mark" aria-hidden="true">A</span>
          <span className="brand-copy">
            <strong>Field Guide</strong>
            <small>ACME WIDGET API</small>
          </span>
        </a>

        <button
          className="new-chat-button"
          type="button"
          onClick={() => {
            setMessages([]);
            setInput('');
          }}
        >
          <span aria-hidden="true">+</span> New conversation
        </button>

        <div className="rail-section">
          <p className="rail-label">FAQs</p>
          <button
            className="corpus-entry corpus-button"
            type="button"
            onClick={() => setInput('Give me an overview of the Acme Widget API.')}
          >
            <span className="corpus-glyph" aria-hidden="true">R</span>
            <span>
              <strong>API Field Guide</strong>
              <small>Overview · 18 documents</small>
            </span>
            <span className="ready-dot" aria-label="Index ready" />
          </button>
        </div>

        <div className="rail-section recent-section">
          <p className="rail-label">EXPLORE</p>
          {suggestions.map((question, index) => (
            <button
              className="rail-link"
              key={question}
              type="button"
              onClick={() => setInput(question)}
            >
              <span className="rail-link-index">0{index + 1}</span>
              {['Authentication', 'Rate limits', 'Error handling', 'Standards'][index]}
            </button>
          ))}
        </div>

        <div className="rail-footer">
          <span className="ready-dot" /> Corpus available
          <small>Answers cite the source material</small>
        </div>
      </aside>

      <section className="guide-workspace" id="top">
        <header className="workspace-bar">
          <div className="breadcrumb"><span>REFERENCE DESK</span><b>/</b> API DOCUMENTATION</div>
          <div className="source-count"><span className="ready-dot" /> 18 SOURCES INDEXED</div>
        </header>

        <div className="conversation-column">
          {messages.length === 0 ? (
            <section className="welcome-panel" aria-labelledby="welcome-title">
              <div className="welcome-seal" aria-hidden="true"><span>AG</span></div>
              <p className="eyebrow">A GROUNDED READING COMPANION</p>
              <h1 id="welcome-title">Ask the <em>field guide.</em></h1>
              <p className="welcome-copy">
                Explore your API reference with answers that show their work.
                Every response is grounded in the documents you chose.
              </p>
              <div className="suggestion-list" aria-label="Suggested questions">
                {suggestions.map((question) => (
                  <button
                    className="suggestion-chip"
                    key={question}
                    type="button"
                    onClick={() => setInput(question)}
                  >
                    {question}<span aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <ul className="message-list" aria-live="polite">
              {messages.map((message) => (
                <li className={`message-row message-${message.role}`} key={message.id}>
                  {message.role === 'assistant' && <span className="assistant-mark">AG</span>}
                  <div className="message-content">
                    <span className="message-speaker">{message.role === 'user' ? 'YOU' : 'FIELD GUIDE'}</span>
                    {message.role === 'assistant' ? (
                      <div className="message-bubble markdown-body">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="message-bubble">{message.content}</div>
                    )}
                    {message.role === 'assistant' &&
                      message.toolInvocations?.map(
                        (invocation) =>
                          invocation.state === 'result' &&
                          invocation.toolName === 'getInformation' && (
                            <details className="source-disclosure" key={invocation.toolCallId}>
                              <summary>
                                Sources
                                {SCOPE_LABELS[(invocation.args as { scope?: string })?.scope ?? ''] && (
                                  <> · {SCOPE_LABELS[(invocation.args as { scope?: string }).scope as string]}</>
                                )}{' '}
                                <span>{(invocation.result as Source[]).length}</span>
                              </summary>
                              <ul className="source-list">
                                {(invocation.result as Source[]).map((source, index) => (
                                  <li className="source-item" key={`${source.source}-${index}`} title={source.document || undefined}>
                                    <span className="source-meta">
                                      {source.source ?? 'Unknown source'} <b>/</b> {source.section ?? 'Unlabeled section'}
                                      <span className="source-score">
                                        {typeof source.score === 'number' ? source.score.toFixed(2) : '—'}
                                      </span>
                                    </span>
                                    <p>{source.text}</p>
                                  </li>
                                ))}
                              </ul>
                            </details>
                          ),
                      )}
                  </div>
                </li>
              ))}
              {isBusy && <li className="typing-status"><span /> Consulting the field guide…</li>}
              {error && <li className="error-message">The request could not be completed: {error.message}</li>}
            </ul>
          )}

          {messages.length === 0 && error && <p className="error-message">The request could not be completed: {error.message}</p>}

          <div className="composer-wrap">
            <form onSubmit={handleSubmit} className="composer">
              <label className="sr-only" htmlFor="question-input">Ask the field guide</label>
              <input
                id="question-input"
                value={input}
                onChange={handleInputChange}
                placeholder="Ask a question about your API corpus…"
                disabled={isBusy}
              />
              <button className="send-button" type="submit" aria-label="Send question" disabled={!input.trim() || isBusy}>
                <span aria-hidden="true">↑</span>
              </button>
            </form>
            <p className="composer-note">Answers are grounded in the indexed documents <span>·</span> press Enter to send</p>
          </div>
        </div>
      </section>
    </main>
  );
}
