'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isGreeting?: boolean;
}

const EXAMPLES = [
  'What are you currently working on?',
  'What is your tech stack for AI systems?',
  'Tell me about your most impactful project.',
  'Are you open to new opportunities?',
  'How do you evaluate AI systems in production?',
  'What is your approach to architecture decisions?',
];

const SKILLS = [
  'RAG Pipelines',
  'Agentic AI',
  'Multi-agent Systems',
  'MCP Integrations',
  'Azure OpenAI',
  'pgvector / HNSW',
  'Python · Java · Go',
  'TOGAF · CDMP',
];

const GREETING =
  "Hi — I'm Ali's digital twin. Ask me anything about his professional background, skills, experience, or career philosophy.";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: GREETING, isGreeting: true },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const history = messages
        .filter((m) => !m.isGreeting && m.content)
        .map(({ role, content }) => ({ role, content }));

      setMessages((prev) => [
        ...prev,
        { role: 'user', content: trimmed },
        { role: 'assistant', content: '' },
      ]);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      setIsLoading(true);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed, history }),
        });

        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') continue;
            try {
              const parsed = JSON.parse(raw);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: updated[updated.length - 1].content + delta,
                  };
                  return updated;
                });
              }
            } catch {
              // ignore malformed SSE chunks
            }
          }
        }
      } catch {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: 'Something went wrong. Please try again.',
          };
          return updated;
        });
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="shrink-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3">
        <Avatar size="sm" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 leading-tight">Ali Alperen Colak</p>
          <p className="text-xs text-slate-500 leading-tight">AI Solutions Architect · MHP, A Porsche Company</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-500 font-medium">Online</span>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-72 shrink-0 bg-white border-r border-slate-200 overflow-y-auto scrollbar-thin">
          <div className="p-6">
            {/* Profile */}
            <div className="flex flex-col items-center text-center mb-6">
              <Avatar size="lg" />
              <h2 className="mt-3 text-base font-semibold text-slate-900">Ali Alperen Colak</h2>
              <p className="text-sm text-slate-500 mt-0.5">AI Solutions Architect</p>
              <p className="text-xs text-slate-400 mt-0.5">MHP — A Porsche Company</p>
              <span className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                <LocationIcon />
                Stuttgart, Germany
              </span>
            </div>

            <Divider />

            {/* Skills */}
            <section className="mb-6">
              <SectionLabel>Expertise</SectionLabel>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {SKILLS.map((s) => (
                  <span
                    key={s}
                    className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </section>

            <Divider />

            {/* Example questions */}
            <section>
              <SectionLabel>Ask me about</SectionLabel>
              <div className="flex flex-col gap-1 mt-2">
                {EXAMPLES.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    disabled={isLoading}
                    className="text-left text-xs text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-auto px-6 pb-5">
            <p className="text-xs text-slate-400 text-center leading-relaxed">
              AI-generated responses based on provided professional data. For professional enquiries only.
            </p>
          </div>
        </aside>

        {/* Chat main */}
        <main className="flex flex-col flex-1 overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6 space-y-5">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 animate-fade-in ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="shrink-0 mt-0.5">
                    <Avatar size="xs" />
                  </div>
                )}

                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-sm shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
                  }`}
                >
                  {msg.content || (
                    <span className="flex items-center gap-1 py-0.5">
                      <Dot delay={0} />
                      <Dot delay={150} />
                      <Dot delay={300} />
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="shrink-0 bg-white border-t border-slate-200 px-4 pt-3 pb-4">
            {/* Mobile quick questions */}
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1 lg:hidden">
              {EXAMPLES.slice(0, 3).map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  disabled={isLoading}
                  className="shrink-0 text-xs text-slate-600 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 px-3 py-1.5 rounded-full transition-colors disabled:opacity-40"
                >
                  {q}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Ask a professional question… (Enter to send)"
                rows={1}
                maxLength={500}
                disabled={isLoading}
                className="flex-1 resize-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-shadow"
                style={{ minHeight: '42px', maxHeight: '128px' }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                aria-label="Send"
                className="shrink-0 w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-200 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
              >
                <SendIcon />
              </button>
            </form>

            <p className="mt-2 text-center text-xs text-slate-400">
              Professional queries only · Responses are AI-generated
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function Avatar({ size }: { size: 'xs' | 'sm' | 'lg' }) {
  const cls = {
    xs: 'w-7 h-7 text-xs',
    sm: 'w-9 h-9 text-sm',
    lg: 'w-20 h-20 text-2xl',
  }[size];
  return (
    <div
      className={`${cls} rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold select-none shrink-0`}
    >
      AC
    </div>
  );
}

function Divider() {
  return <hr className="border-slate-100 mb-5" />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{children}</p>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}

function LocationIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}
