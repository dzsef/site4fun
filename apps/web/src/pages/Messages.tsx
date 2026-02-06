import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import ConversationList from '../components/chat/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';
import type { ChatEvent, ConversationSummary, Message } from '../types/chat';
import type { ProfileResponse } from '../types/profile';
import {
  createConversation,
  fetchConversations,
  fetchMessages,
  markConversationRead,
  sendMessage,
} from '../utils/chatApi';
import { openChatSocket } from '../utils/chatSocket';
import { PROFILE_CACHE_EVENT, readProfileCache } from '../utils/profileCache';

type JobCardDraft = {
  title: string;
  location: string;
  start_date: string;
  end_date: string;
  trade: string;
  budget_range: string;
};

const JOB_CARD_PREFIX = '__JOB_CARD__:';

const buildJobCardBody = (draft: JobCardDraft): string => {
  return `${JOB_CARD_PREFIX}${JSON.stringify({ v: 1, ...draft })}`;
};

const mergeMessagesById = (base: Message[], extra: Message[]): Message[] => {
  const map = new Map<string, Message>();
  for (const message of base) map.set(message.id, message);
  for (const message of extra) {
    if (!map.has(message.id)) {
      map.set(message.id, message);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
};

const sortConversations = (items: ConversationSummary[]) =>
  [...items].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );

const Messages: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [profile, setProfile] = useState<ProfileResponse | null>(() => readProfileCache());
  const viewerRole = profile?.role ?? null;

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const conversationsRef = useRef<ConversationSummary[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(null);

  const updateConversations = useCallback(
    (updater: (prev: ConversationSummary[]) => ConversationSummary[]) => {
      setConversations((prev) => {
        const next = sortConversations(updater(prev));
        conversationsRef.current = next;
        return next;
      });
    },
    [],
  );

  const initialConversation = searchParams.get('conversation');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(initialConversation);
  const activeConversationIdRef = useRef<string | null>(initialConversation);

  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesHasMore, setMessagesHasMore] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const [socketStatus, setSocketStatus] = useState<'idle' | 'connected' | 'error'>('idle');
  const startCounterpartyId = searchParams.get('start');
  const searchParamsKey = searchParams.toString();
  const processedStartRef = useRef<string | null>(null);

  // If both parameters are present, we treat `conversation` as the source of truth
  // and remove `start` to prevent the start-flow from re-triggering.
  useEffect(() => {
    const start = searchParams.get('start');
    const conversation = searchParams.get('conversation');
    if (!start || !conversation) return;
    const params = new URLSearchParams(searchParams);
    params.delete('start');
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  const [jobCardOpen, setJobCardOpen] = useState(false);
  const [jobCardError, setJobCardError] = useState<string | null>(null);
  const [jobCardPromptConversationId, setJobCardPromptConversationId] = useState<string | null>(null);
  const [jobCardDraft, setJobCardDraft] = useState<JobCardDraft>({
    title: '',
    location: '',
    start_date: '',
    end_date: '',
    trade: 'General',
    budget_range: '',
  });

  const outreachInFlightRef = useRef<Set<string>>(new Set());
  const autoOutreachAttemptedRef = useRef<Map<string, string>>(new Map());

  const peekOutreach = useCallback((counterpartyId: number): string | null => {
    try {
      const key = `chat:outreach:${counterpartyId}`;
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }, []);

  const clearOutreach = useCallback((counterpartyId: number) => {
    try {
      sessionStorage.removeItem(`chat:outreach:${counterpartyId}`);
    } catch {
      // ignore
    }
  }, []);

  const sendPendingOutreach = useCallback(
    async (conversationId: string, counterpartyId: number) => {
      if (!token) return;
      const outreach = peekOutreach(counterpartyId);
      if (!outreach) return;

      const trimmed = outreach.trim();
      const safeOutreach = trimmed.length > 200 ? trimmed.slice(0, 200) : trimmed;
      if (!safeOutreach) return;

      const flightKey = `${conversationId}:${counterpartyId}`;
      if (outreachInFlightRef.current.has(flightKey)) return;
      outreachInFlightRef.current.add(flightKey);

      // Ensure the job-card prompt is available right away; message send may fail/retry.
      setJobCardPromptConversationId(conversationId);

      try {
        const response = await sendMessage(token, conversationId, safeOutreach);
        clearOutreach(counterpartyId);
        autoOutreachAttemptedRef.current.delete(flightKey);
        setMessages((prev) => (prev.some((m) => m.id === response.message.id) ? prev : [...prev, response.message]));
        updateConversations((prev) =>
          prev.map((convo) =>
            convo.id === conversationId
              ? {
                ...convo,
                last_message: response.message,
                updated_at: response.message.created_at,
                unread_count: 0,
              }
              : convo,
          ),
        );
      } catch (error) {
        console.error('Failed to send outreach', error);
        setMessagesError((error as Error).message || 'Failed to send message');
      } finally {
        outreachInFlightRef.current.delete(flightKey);
      }
    },
    [clearOutreach, peekOutreach, token, updateConversations],
  );

  useEffect(() => {
    const handleCacheUpdated = (event: Event) => {
      const custom = event as CustomEvent<ProfileResponse | null>;
      setProfile(custom.detail ?? null);
    };
    window.addEventListener(PROFILE_CACHE_EVENT, handleCacheUpdated);
    return () => window.removeEventListener(PROFILE_CACHE_EVENT, handleCacheUpdated);
  }, []);

  useEffect(() => {
    const updateToken = () => setToken(localStorage.getItem('token'));
    window.addEventListener('auth-changed', updateToken);
    window.addEventListener('storage', updateToken);
    return () => {
      window.removeEventListener('auth-changed', updateToken);
      window.removeEventListener('storage', updateToken);
    };
  }, []);

  // If the user has a pending outreach draft for the currently selected conversation,
  // send it even if `start` is missing/was already stripped from the URL.
  useEffect(() => {
    if (!token) return;
    const active = activeConversationIdRef.current;
    if (!active) return;
    const convo = conversationsRef.current.find((c) => c.id === active);
    if (!convo) return;
    const flightKey = `${active}:${convo.counterpart.user_id}`;
    const draft = peekOutreach(convo.counterpart.user_id);
    if (!draft) {
      autoOutreachAttemptedRef.current.delete(flightKey);
      return;
    }
    const prevDraft = autoOutreachAttemptedRef.current.get(flightKey);
    if (prevDraft === draft) return;
    autoOutreachAttemptedRef.current.set(flightKey, draft);
    void sendPendingOutreach(active, convo.counterpart.user_id);
  }, [activeConversationId, conversations, peekOutreach, sendPendingOutreach, token]);

  useEffect(() => {
    if (!token) {
      const next = encodeURIComponent('/messages');
      navigate(`/login?next=${next}`, { replace: true });
    }
  }, [navigate, token]);

  const selectConversation = useCallback(
    (conversationId: string | null) => {
      if (conversationId === activeConversationIdRef.current) {
        const params = new URLSearchParams(searchParamsKey);
        if (conversationId) {
          if (params.get('conversation') !== conversationId) {
            params.set('conversation', conversationId);
            setSearchParams(params, { replace: true });
          }
        } else if (params.has('conversation')) {
          params.delete('conversation');
          setSearchParams(params, { replace: true });
        }
        return;
      }
      setActiveConversationId(conversationId);
      activeConversationIdRef.current = conversationId;
      setMessages([]);
      setMessagesHasMore(false);
      setMessagesError(null);
      const params = new URLSearchParams(searchParamsKey);
      if (conversationId) {
        params.set('conversation', conversationId);
      } else {
        params.delete('conversation');
      }
      setSearchParams(params, { replace: true });
    },
    [searchParamsKey, setSearchParams],
  );

  const refreshConversations = useCallback(async () => {
    if (!token) return;
    setConversationsLoading(true);
    setConversationsError(null);
    try {
      const response = await fetchConversations(token);
      updateConversations(() => response.conversations);
    } catch (error) {
      console.error(error);
      setConversationsError((error as Error).message);
    } finally {
      setConversationsLoading(false);
    }
  }, [token, updateConversations]);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!token) return;
      setMessagesLoading(true);
      setMessagesError(null);
      try {
        const response = await fetchMessages(token, conversationId);
        // Merge instead of overwriting to avoid races with immediate outreach sends.
        setMessages((prev) => mergeMessagesById(response.messages, prev));
        setMessagesHasMore(response.has_more);
        if (response.messages.length) {
          const last = response.messages[response.messages.length - 1];
          await markConversationRead(token, conversationId, last.id).catch((error) => {
            console.error('Failed to mark read', error);
          });
          updateConversations((prev) =>
            prev.map((convo) =>
              convo.id === conversationId
                ? { ...convo, unread_count: 0, updated_at: last.created_at, last_message: last }
                : convo,
            ),
          );
        } else {
          await markConversationRead(token, conversationId).catch((error) => {
            console.error('Failed to mark read', error);
          });
          updateConversations((prev) =>
            prev.map((convo) => (convo.id === conversationId ? { ...convo, unread_count: 0 } : convo)),
          );
        }
      } catch (error) {
        console.error(error);
        setMessagesError((error as Error).message);
      } finally {
        setMessagesLoading(false);
      }
    },
    [token, updateConversations],
  );

  useEffect(() => {
    const activeId = activeConversationIdRef.current;
    if (token && activeId) {
      loadMessages(activeId);
    } else {
      setMessages([]);
      setMessagesHasMore(false);
      setMessagesLoading(false);
      setMessagesError(null);
    }
  }, [loadMessages, token, activeConversationId]);

  const handleLoadOlder = useCallback(async () => {
    const activeId = activeConversationIdRef.current;
    if (!token || !activeId || !messages.length) return;
    try {
      const response = await fetchMessages(token, activeId, messages[0].id);
      if (response.messages.length) {
        const existingIds = new Set(messages.map((message) => message.id));
        setMessages((prev) => [
          ...response.messages.filter((message) => !existingIds.has(message.id)),
          ...prev,
        ]);
      }
      setMessagesHasMore(response.has_more);
    } catch (error) {
      console.error(error);
      setMessagesError((error as Error).message);
    }
  }, [messages, token]);

  const handleSendMessage = useCallback(
    async (body: string) => {
      const activeId = activeConversationIdRef.current;
      if (!token || !activeId) return;
      const response = await sendMessage(token, activeId, body);
      setMessages((prev) => [...prev, response.message]);
      updateConversations((prev) =>
        prev.map((convo) =>
          convo.id === activeId
            ? {
              ...convo,
              last_message: response.message,
              updated_at: response.message.created_at,
              unread_count: 0,
            }
            : convo,
        ),
      );
    },
    [token, updateConversations],
  );

  const applyMessageEvent = useCallback(
    (message: Message) => {
      const activeId = activeConversationIdRef.current;
      updateConversations((prev) =>
        prev.map((convo) => {
          if (convo.id !== message.conversation_id) {
            return convo;
          }
          const fromCounterpart = message.sender_id === convo.counterpart.user_id;
          const unread = convo.id === activeId ? 0 : fromCounterpart ? convo.unread_count + 1 : convo.unread_count;
          return {
            ...convo,
            last_message: message,
            updated_at: message.created_at,
            unread_count: unread,
          };
        }),
      );

      if (message.conversation_id === activeId) {
        setMessages((prev) => {
          if (prev.some((existing) => existing.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });
        const conversation = conversationsRef.current.find((c) => c.id === activeId);
        if (conversation && message.sender_id === conversation.counterpart.user_id && token) {
          markConversationRead(token, activeId, message.id)
            .then(() => {
              updateConversations((prev) =>
                prev.map((convo) =>
                  convo.id === activeId
                    ? { ...convo, unread_count: 0, last_message: message, updated_at: message.created_at }
                    : convo,
                ),
              );
            })
            .catch((error) => console.error('Failed to mark read', error));
        }
      }
    },
    [token, updateConversations],
  );

  const handleSocketEvent = useCallback(
    (event: ChatEvent) => {
      switch (event.event) {
        case 'connection.established':
          setSocketStatus('connected');
          break;
        case 'conversation.created':
          updateConversations((prev) => {
            const exists = prev.some((convo) => convo.id === event.conversation.id);
            if (exists) {
              return prev.map((convo) =>
                convo.id === event.conversation.id ? { ...convo, ...event.conversation } : convo,
              );
            }
            return [...prev, event.conversation];
          });
          break;
        case 'message.created':
          applyMessageEvent(event.message);
          break;
        case 'conversation.read':
          updateConversations((prev) =>
            prev.map((convo) =>
              convo.id === event.conversation_id ? { ...convo, unread_count: 0 } : convo,
            ),
          );
          break;
        default:
          break;
      }
    },
    [applyMessageEvent, updateConversations],
  );

  useEffect(() => {
    if (!token) return;
    const socket = openChatSocket(
      token,
      (event) => handleSocketEvent(event),
      () => setSocketStatus('error'),
    );
    return () => socket.close();
  }, [handleSocketEvent, token]);

  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId) ?? null;

  useEffect(() => {
    if (!token) return;
    if (!startCounterpartyId) {
      processedStartRef.current = null;
      return;
    }
    if (processedStartRef.current === startCounterpartyId) {
      return;
    }

    const counterpartyId = Number(startCounterpartyId);
    if (!Number.isFinite(counterpartyId)) {
      const params = new URLSearchParams(searchParamsKey);
      params.delete('start');
      setSearchParams(params, { replace: true });
      return;
    }

    processedStartRef.current = startCounterpartyId;

    const existingConversation = conversationsRef.current.find(
      (conversation) => conversation.counterpart.user_id === counterpartyId,
    );
    if (existingConversation) {
      selectConversation(existingConversation.id);
      if (token) {
        void sendPendingOutreach(existingConversation.id, counterpartyId);
      }
      const params = new URLSearchParams(searchParamsKey);
      params.delete('start');
      params.set('conversation', existingConversation.id);
      setSearchParams(params, { replace: true });
      processedStartRef.current = null;
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams(searchParamsKey);

    const createAndSelect = async () => {
      try {
        setMessagesLoading(true);
        setMessagesError(null);
        const response = await createConversation(token, counterpartyId);
        if (cancelled) return;
        updateConversations((prev) => {
          const exists = prev.some((conversation) => conversation.id === response.conversation.id);
          if (exists) {
            return prev.map((conversation) =>
              conversation.id === response.conversation.id ? response.conversation : conversation,
            );
          }
          return [...prev, response.conversation];
        });
        selectConversation(response.conversation.id);
        params.delete('start');
        params.set('conversation', response.conversation.id);
        setSearchParams(params, { replace: true });

        await sendPendingOutreach(response.conversation.id, counterpartyId);
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          const message = (error as Error).message;
          setMessagesError(message);
          if (message.toLowerCase().includes('unauth')) {
            localStorage.removeItem('token');
            window.dispatchEvent(new Event('auth-changed'));
            const next = encodeURIComponent('/messages');
            navigate(`/login?next=${next}`, { replace: true });
          }
          params.delete('start');
          setSearchParams(params, { replace: true });
        }
      } finally {
        if (!cancelled) {
          setMessagesLoading(false);
          processedStartRef.current = null;
        }
      }
    };

    createAndSelect();

    return () => {
      cancelled = true;
    };
  }, [clearOutreach, navigate, peekOutreach, selectConversation, setSearchParams, startCounterpartyId, token, updateConversations, viewerRole, searchParamsKey]);

  const openJobCard = () => {
    setJobCardError(null);
    setJobCardOpen(true);
  };

  const closeJobCard = () => {
    setJobCardOpen(false);
    setJobCardError(null);
  };

  const submitJobCard = async () => {
    try {
      setJobCardError(null);
      const activeId = activeConversationIdRef.current;
      if (!token || !activeId) return;
      if (!jobCardDraft.title.trim()) {
        setJobCardError(t('messages.jobCard.errors.title'));
        return;
      }
      if (!jobCardDraft.location.trim()) {
        setJobCardError(t('messages.jobCard.errors.location'));
        return;
      }
      if (!jobCardDraft.start_date || !jobCardDraft.end_date) {
        setJobCardError(t('messages.jobCard.errors.dates'));
        return;
      }
      const body = buildJobCardBody({
        ...jobCardDraft,
        title: jobCardDraft.title.trim(),
        location: jobCardDraft.location.trim(),
        budget_range: jobCardDraft.budget_range.trim(),
        trade: jobCardDraft.trade.trim(),
      });

      await handleSendMessage(body);
      try {
        localStorage.setItem('jobcard:last', JSON.stringify(jobCardDraft));
      } catch {
        // ignore
      }
      setJobCardPromptConversationId(null);
      closeJobCard();
    } catch (e) {
      console.error(e);
      setJobCardError((e as Error).message);
    }
  };

  const background = (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute -left-32 top-28 h-[38rem] w-[38rem] rounded-full bg-primary/12 blur-[170px]" />
      <div className="absolute right-[-26rem] top-10 h-[42rem] w-[42rem] rounded-full bg-indigo-500/14 blur-[200px]" />
      <div className="absolute left-1/2 bottom-[-18rem] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-emerald-500/12 blur-[190px]" />
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#050810] via-[#050A12] to-[#070C18] text-gray-100">
      {background}
      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 pb-24 pt-24">
        <header className="space-y-4">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.42em] text-primary/70 shadow-[0_0_44px_rgba(245,184,0,0.18)]">
            {t('messages.tagline')}
          </span>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold text-white md:text-5xl">{t('messages.title')}</h1>
            <p className="max-w-3xl text-lg text-white/70 md:text-xl">{t('messages.subtitle')}</p>
          </div>
        </header>

        {conversationsError && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {conversationsError}
          </div>
        )}

        <div className="grid min-h-[34rem] gap-6 lg:grid-cols-[22rem_1fr]">
          <div className="rounded-[2.5rem] border border-white/12 bg-white/[0.05] p-5 shadow-[0_35px_120px_rgba(5,9,18,0.65)] backdrop-blur-xl">
            {conversationsLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-white/50">
                Loading conversations...
              </div>
            ) : (
              <ConversationList
                conversations={conversations}
                activeId={activeConversationId}
                onSelect={selectConversation}
              />
            )}
          </div>

          <div className="relative min-h-[34rem]">
            {activeConversation ? (
              <ChatWindow
                messages={messages}
                counterpartId={activeConversation.counterpart.user_id}
                onSend={handleSendMessage}
                onLoadMore={messagesHasMore ? handleLoadOlder : undefined}
                hasMore={messagesHasMore}
                viewerRole={viewerRole}
                jobCardPrompt={
                  viewerRole === 'contractor' && jobCardPromptConversationId === activeConversation.id
                    ? { label: t('messages.jobCard.prompt'), onClick: openJobCard }
                    : null
                }
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-[2.5rem] border border-white/12 bg-white/[0.04] px-8 py-12 text-center text-sm text-white/60 shadow-[0_35px_120px_rgba(5,9,18,0.65)]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/70">
                    {t('messages.emptyListHeading')}
                  </p>
                  <p className="mt-3 text-sm text-white/60">{t('messages.emptyListBody')}</p>
                </div>
              </div>
            )}
            {messagesLoading && (
              <div className="pointer-events-none absolute inset-0 flex items-end justify-end p-6">
                <div className="rounded-2xl border border-white/10 bg-dark-900/80 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-white/70 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
                  Loading...
                </div>
              </div>
            )}
            {messagesError && (
              <div className="absolute bottom-4 left-1/2 w-[min(420px,90%)] -translate-x-1/2 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs text-red-200">
                {messagesError}
              </div>
            )}
          </div>
        </div>

        {socketStatus === 'error' && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
            Realtime updates are temporarily unavailable. Messages will still arrive on refresh.
          </div>
        )}
      </section>

      {jobCardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-[min(760px,92%)] overflow-hidden rounded-3xl border border-white/10 bg-dark-900/95 p-8 shadow-[0_40px_120px_rgba(0,0,0,0.6)]">
            <button
              onClick={closeJobCard}
              className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold uppercase tracking-[0.3em] text-white/70 transition-transform duration-300 hover:-translate-y-0.5 hover:text-white"
            >
              ✕
            </button>
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/75">
                  {t('messages.jobCard.tagline')}
                </p>
                <h2 className="text-2xl font-semibold text-white">{t('messages.jobCard.title')}</h2>
                <p className="text-sm text-white/70">{t('messages.jobCard.subtitle')}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                    {t('messages.jobCard.fields.title')}
                  </label>
                  <input
                    value={jobCardDraft.title}
                    onChange={(e) => setJobCardDraft((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder-white/40 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                    {t('messages.jobCard.fields.location')}
                  </label>
                  <input
                    value={jobCardDraft.location}
                    onChange={(e) => setJobCardDraft((prev) => ({ ...prev, location: e.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder-white/40 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                    {t('messages.jobCard.fields.startDate')}
                  </label>
                  <input
                    type="date"
                    value={jobCardDraft.start_date}
                    onChange={(e) => setJobCardDraft((prev) => ({ ...prev, start_date: e.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                    {t('messages.jobCard.fields.endDate')}
                  </label>
                  <input
                    type="date"
                    value={jobCardDraft.end_date}
                    onChange={(e) => setJobCardDraft((prev) => ({ ...prev, end_date: e.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                    {t('messages.jobCard.fields.trade')}
                  </label>
                  <select
                    value={jobCardDraft.trade}
                    onChange={(e) => setJobCardDraft((prev) => ({ ...prev, trade: e.target.value }))}
                    className="w-full appearance-none rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {['General', 'Carpentry', 'Electrical', 'Plumbing', 'Drywall', 'Painting', 'Flooring', 'HVAC', 'Other'].map((trade) => (
                      <option key={trade} value={trade}>
                        {trade}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                    {t('messages.jobCard.fields.budget')}
                  </label>
                  <input
                    value={jobCardDraft.budget_range}
                    onChange={(e) => setJobCardDraft((prev) => ({ ...prev, budget_range: e.target.value }))}
                    placeholder="e.g. $2,000–$4,000"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder-white/40 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              {jobCardError && <p className="text-sm text-rose-200">{jobCardError}</p>}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeJobCard}
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-xs font-semibold uppercase tracking-[0.32em] text-white/75 transition hover:border-white/25 hover:text-white"
                >
                  {t('messages.jobCard.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => void submitJobCard()}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-primary via-amber-400 to-orange-500 px-6 py-3 text-xs font-semibold uppercase tracking-[0.32em] text-dark-900 shadow-[0_28px_70px_rgba(245,184,0,0.45)] transition-transform duration-300 hover:scale-[1.02]"
                >
                  {t('messages.jobCard.send')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
