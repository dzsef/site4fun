import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Message } from '../../types/chat';

export type ChatWindowProps = {
  messages: Message[];
  counterpartId: number | null;
  onSend: (body: string) => Promise<void>;
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
};

const formatTimestamp = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, counterpartId, onSend, onLoadMore, hasMore }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const previousMessageCount = useRef<number>(0);

  useEffect(() => {
    if (!viewportRef.current) return;
    const container = viewportRef.current;
    if (messages.length === 0) {
      container.scrollTop = container.scrollHeight;
      previousMessageCount.current = 0;
      return;
    }

    if (messages.length > previousMessageCount.current) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
    previousMessageCount.current = messages.length;
  }, [messages]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim()) return;
    try {
      setBusy(true);
      await onSend(draft.trim());
      setDraft('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-[2.5rem] border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-[0_30px_120px_rgba(5,9,18,0.7)]">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
        <span>{t('messages.title')}</span>
        {hasMore && onLoadMore && (
          <button
            type="button"
            onClick={() => onLoadMore()}
            className="rounded-full border border-white/20 px-4 py-1 text-[0.6rem] tracking-[0.3em] text-white/70 transition-colors duration-200 hover:border-primary/60 hover:text-primary"
          >
            {t('messages.loadOlder')}
          </button>
        )}
      </div>

      <div ref={viewportRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-white/50">
            <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-4 text-center shadow-[0_18px_70px_rgba(3,7,18,0.5)]">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">{t('messages.emptyChatHeading')}</p>
              <p className="mt-2 text-sm text-white/60">{t('messages.emptyChatBody')}</p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isMine = counterpartId != null ? message.sender_id !== counterpartId : true;
            return (
              <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[70%] rounded-3xl px-5 py-3 text-sm shadow-[0_18px_60px_rgba(0,0,0,0.45)] transition-transform duration-300 ${
                    isMine
                      ? 'bg-gradient-to-br from-primary via-amber-400 to-orange-500 text-dark-900'
                      : 'bg-white/[0.08] text-white/90'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{message.body}</p>
                  <div className={`mt-2 text-[0.6rem] uppercase tracking-[0.35em] ${isMine ? 'text-[#1b2230]' : 'text-white/50'}`}>
                    {formatTimestamp(message.created_at)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-white/10 px-6 py-4">
        <div className="flex items-end gap-4">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t('messages.composerPlaceholder')}
            className="h-16 flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder-white/40 shadow-[0_15px_50px_rgba(3,7,18,0.55)] focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-amber-400 to-orange-500 text-dark-900 shadow-[0_22px_60px_rgba(245,184,0,0.35)] transition-transform duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4 20 12 4 20 6 12 4 4Z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;
