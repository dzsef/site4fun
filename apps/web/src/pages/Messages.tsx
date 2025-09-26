import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import ConversationList from '../components/chat/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';
import type { ChatEvent, ConversationSummary, Message } from '../types/chat';
import {
  createConversation,
  fetchConversations,
  fetchMessages,
  markConversationRead,
  sendMessage,
} from '../utils/chatApi';
import { openChatSocket } from '../utils/chatSocket';

const sortConversations = (items: ConversationSummary[]) =>
  [...items].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );

const Messages: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = useMemo(() => localStorage.getItem('token'), []);

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const conversationsRef = useRef<ConversationSummary[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!token) {
      const next = encodeURIComponent('/messages');
      navigate(`/login?next=${next}`, { replace: true });
    }
  }, [navigate, token]);

  const updateConversations = useCallback((updater: (prev: ConversationSummary[]) => ConversationSummary[]) => {
    setConversations((prev) => {
      const next = sortConversations(updater(prev));
      conversationsRef.current = next;
      return next;
    });
  }, []);

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
        setMessages(response.messages);
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
  }, [navigate, selectConversation, setSearchParams, startCounterpartyId, token, updateConversations, searchParamsKey]);

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
    </div>
  );
};

export default Messages;
