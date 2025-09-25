import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ConversationSummary } from '../../types/chat';

export type ConversationListProps = {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (conversationId: string) => void;
};

const ConversationList: React.FC<ConversationListProps> = ({ conversations, activeId, onSelect }) => {
  const { t } = useTranslation();

  if (!conversations.length) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-white/50">
        <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-4 text-center shadow-[0_18px_70px_rgba(3,7,18,0.5)]">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">{t('messages.emptyListHeading')}</p>
          <p className="mt-2 text-sm text-white/60">{t('messages.emptyListBody')}</p>
        </div>
      </div>
    );
  }

  return (
    <ul className="flex h-full flex-col gap-2 overflow-y-auto pr-2">
      {conversations.map((conversation) => {
        const isActive = conversation.id === activeId;
        const counterpart = conversation.counterpart;
        const lastMessage = conversation.last_message;
        return (
          <li key={conversation.id}>
            <button
              type="button"
              onClick={() => onSelect(conversation.id)}
              className={`group flex w-full items-center gap-4 rounded-3xl border border-white/10 px-5 py-4 text-left shadow-[0_20px_60px_rgba(11,17,30,0.45)] transition-all duration-300 hover:border-primary/60 hover:bg-white/10 ${
                isActive ? 'bg-white/10 border-primary/60' : 'bg-white/[0.04]'
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[#101726] text-lg font-semibold uppercase tracking-[0.3em] text-white/70">
                {counterpart.avatar_url ? (
                  <img
                    src={counterpart.avatar_url}
                    alt={counterpart.name ?? 'Avatar'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{(counterpart.name ?? '?').slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-semibold text-white">
                    {counterpart.name ?? t('contractorCrew.card.noName')}
                  </span>
                  <span className="text-[0.6rem] uppercase tracking-[0.35em] text-white/40">
                    {new Date(conversation.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs text-white/60">
                  {lastMessage?.body ?? t('messages.noMessagesSnippet')}
                </p>
              </div>
              {conversation.unread_count > 0 && (
                <span className="flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-primary text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-dark-900">
                  {conversation.unread_count}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export default ConversationList;
