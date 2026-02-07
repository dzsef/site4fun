import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Message } from '../../types/chat';
import { decideApplication } from '../../utils/jobApplicationsApi';

export type ChatWindowProps = {
  messages: Message[];
  counterpartId: number | null;
  onSend: (body: string) => Promise<void>;
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
  viewerRole?: 'contractor' | 'specialist' | 'subcontractor' | 'homeowner' | null;
  jobCardPrompt?: { label: string; onClick: () => void } | null;
};

const formatTimestamp = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const JOB_CARD_PREFIX = '__JOB_CARD__:';
const APPLICATION_PREFIX = '__APPLICATION__:';

type JobCardPayload = {
  v: 1;
  title: string;
  location: string;
  start_date: string;
  end_date: string;
  trade: string;
  budget_range: string;
};

const parseJobCard = (body: string): JobCardPayload | null => {
  if (!body.startsWith(JOB_CARD_PREFIX)) return null;
  const raw = body.slice(JOB_CARD_PREFIX.length).trim();
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw) as JobCardPayload;
    if (payload && payload.v === 1) return payload;
    return null;
  } catch {
    return null;
  }
};

type ApplicationPayload = {
  v: 1;
  id: number;
  job_posting_id: number;
  title: string;
  note: string;
  status: 'pending' | 'accepted' | 'rejected';
};

const parseApplication = (body: string): ApplicationPayload | null => {
  if (!body.startsWith(APPLICATION_PREFIX)) return null;
  const raw = body.slice(APPLICATION_PREFIX.length).trim();
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw) as ApplicationPayload;
    if (payload && payload.v === 1 && typeof payload.id === 'number') return payload;
    return null;
  } catch {
    return null;
  }
};

const buildPostingLink = (job: JobCardPayload): string => {
  const params = new URLSearchParams();
  params.set('title', job.title);
  params.set('location', job.location);
  params.set('start_date', job.start_date);
  params.set('end_date', job.end_date);
  params.set('trade', job.trade);
  params.set('budget_range', job.budget_range);
  return `/contractor/job-postings/new?${params.toString()}`;
};

const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  counterpartId,
  onSend,
  onLoadMore,
  hasMore,
  viewerRole = null,
  jobCardPrompt = null,
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [decisionBusyId, setDecisionBusyId] = useState<number | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const previousMessageCount = useRef<number>(0);
  const busyRef = useRef(false);

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

  const sendDraft = useCallback(async () => {
    const trimmed = draft.trim();
    if (!trimmed || busyRef.current) return;
    try {
      busyRef.current = true;
      setBusy(true);
      await onSend(trimmed);
      setDraft('');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [draft, onSend]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await sendDraft();
    },
    [sendDraft],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void sendDraft();
      }
    },
    [sendDraft],
  );

  const token = React.useMemo(() => localStorage.getItem('token'), []);

  const handleDecision = useCallback(
    async (application: ApplicationPayload, decision: 'accepted' | 'rejected') => {
      if (!token) return;
      if (decisionBusyId != null) return;
      try {
        setDecisionError(null);
        setDecisionBusyId(application.id);
        const updated = await decideApplication(token, application.id, decision);
        const body = `${APPLICATION_PREFIX}${JSON.stringify({
          ...application,
          status: updated.status,
        })}`;
        await onSend(body);
      } catch (e) {
        console.error(e);
        setDecisionError((e as Error).message);
      } finally {
        setDecisionBusyId(null);
      }
    },
    [decisionBusyId, onSend, token],
  );

  return (
    <div className="flex h-full flex-col rounded-[2.5rem] border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-[0_30px_120px_rgba(5,9,18,0.7)]">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
        <span>{t('messages.title')}</span>
        <div className="flex items-center gap-3">
          {jobCardPrompt && (
            <button
              type="button"
              onClick={jobCardPrompt.onClick}
              className="rounded-full border border-white/20 bg-white/5 px-4 py-1 text-[0.6rem] tracking-[0.3em] text-white/75 transition-colors duration-200 hover:border-primary/60 hover:text-primary"
            >
              {jobCardPrompt.label}
            </button>
          )}
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
            const jobCard = parseJobCard(message.body);
            const application = parseApplication(message.body);
            if (application) {
              const showActions = viewerRole === 'contractor' && application.status === 'pending' && !isMine;
              const badge =
                application.status === 'pending'
                  ? t('messages.application.status.pending')
                  : application.status === 'accepted'
                    ? t('messages.application.status.accepted')
                    : t('messages.application.status.rejected');
              return (
                <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[78%] rounded-[1.75rem] border px-6 py-5 shadow-[0_18px_60px_rgba(0,0,0,0.45)] ${
                      isMine
                        ? 'border-primary/40 bg-gradient-to-br from-primary/20 via-amber-400/10 to-orange-500/10 text-white'
                        : 'border-white/10 bg-white/[0.06] text-white/90'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-6">
                      <div className="space-y-2">
                        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-white/60">
                          {t('messages.application.label')}
                        </p>
                        <h3 className="text-lg font-semibold text-white">{application.title}</h3>
                      </div>
                      <div className="text-right">
                        <div className="text-[0.6rem] uppercase tracking-[0.35em] text-white/50">
                          {formatTimestamp(message.created_at)}
                        </div>
                        <div className="mt-2 inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-white/75">
                          {badge}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                      <div className="text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-white/55">
                        {t('messages.application.note')}
                      </div>
                      <div className="mt-1 whitespace-pre-wrap break-words text-sm text-white/90">
                        {application.note || '—'}
                      </div>
                    </div>

                    {decisionError && (
                      <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
                        {decisionError}
                      </div>
                    )}

                    {showActions && (
                      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          disabled={decisionBusyId === application.id}
                          onClick={() => void handleDecision(application, 'rejected')}
                          className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-white/80 transition hover:border-white/25 hover:bg-white/10 disabled:opacity-60"
                        >
                          {t('messages.application.actions.reject')}
                        </button>
                        <button
                          type="button"
                          disabled={decisionBusyId === application.id}
                          onClick={() => void handleDecision(application, 'accepted')}
                          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-primary via-amber-400 to-orange-500 px-5 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-dark-900 shadow-[0_18px_60px_rgba(245,184,0,0.35)] transition-transform duration-300 hover:-translate-y-0.5 disabled:opacity-60"
                        >
                          {decisionBusyId === application.id
                            ? t('messages.application.actions.working')
                            : t('messages.application.actions.accept')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            if (jobCard) {
              return (
                <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[78%] rounded-[1.75rem] border px-6 py-5 shadow-[0_18px_60px_rgba(0,0,0,0.45)] ${
                      isMine
                        ? 'border-primary/40 bg-gradient-to-br from-primary/20 via-amber-400/10 to-orange-500/10 text-white'
                        : 'border-white/10 bg-white/[0.06] text-white/90'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-6">
                      <div className="space-y-2">
                        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-white/60">
                          Job card
                        </p>
                        <h3 className="text-lg font-semibold text-white">{jobCard.title}</h3>
                      </div>
                      <div className="text-[0.6rem] uppercase tracking-[0.35em] text-white/50">
                        {formatTimestamp(message.created_at)}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-white/80 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                        <div className="text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-white/55">Location</div>
                        <div className="mt-1 text-white/90">{jobCard.location || '—'}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                        <div className="text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-white/55">Dates</div>
                        <div className="mt-1 text-white/90">
                          {jobCard.start_date || '—'} → {jobCard.end_date || '—'}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                        <div className="text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-white/55">Trade</div>
                        <div className="mt-1 text-white/90">{jobCard.trade || '—'}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                        <div className="text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-white/55">Budget</div>
                        <div className="mt-1 text-white/90">{jobCard.budget_range || '—'}</div>
                      </div>
                    </div>

                    {viewerRole === 'contractor' && isMine && (
                      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-white/60">
                          Publish this as a posting to get more applicants.
                        </p>
                        <Link
                          to={buildPostingLink(jobCard)}
                          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-primary via-amber-400 to-orange-500 px-5 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-dark-900 shadow-[0_18px_60px_rgba(245,184,0,0.35)] transition-transform duration-300 hover:-translate-y-0.5"
                        >
                          Publish posting
                        </Link>
                      </div>
                    )}

                    {viewerRole === 'subcontractor' && !isMine && (
                      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => void onSend('Interested — can you share timing details?')}
                          className="inline-flex items-center justify-center rounded-full bg-white/10 px-5 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-white transition hover:bg-white/15"
                        >
                          Interested
                        </button>
                        <button
                          type="button"
                          onClick={() => void onSend('Not a fit — thanks for reaching out.')}
                          className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-white/80 transition hover:border-white/25 hover:text-white"
                        >
                          Not a fit
                        </button>
                        <button
                          type="button"
                          onClick={() => void onSend('Quick question — what are the key deliverables?')}
                          className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-white/80 transition hover:border-white/25 hover:text-white"
                        >
                          Ask a question
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
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
            onKeyDown={handleKeyDown}
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
