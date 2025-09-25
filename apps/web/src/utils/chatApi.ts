import type {
  ConversationCreatedResponse,
  ConversationListResponse,
  MessageCreatedResponse,
  MessageListResponse,
  ReadReceiptResponse,
} from '../types/chat';

const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const authHeaders = (token: string, extra?: Record<string, string>) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
  ...(extra ?? {}),
});

export const fetchConversations = async (token: string): Promise<ConversationListResponse> => {
  const res = await fetch(`${baseUrl}/chat/conversations`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error('Failed to load conversations');
  }
  return (await res.json()) as ConversationListResponse;
};

export const createConversation = async (
  token: string,
  counterpartyId: number,
): Promise<ConversationCreatedResponse> => {
  const res = await fetch(`${baseUrl}/chat/conversations`, {
    method: 'POST',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ counterparty_id: counterpartyId }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.detail ?? 'Failed to start conversation');
  }
  return (await res.json()) as ConversationCreatedResponse;
};

export const fetchMessages = async (
  token: string,
  conversationId: string,
  beforeId?: string,
  limit = 50,
): Promise<MessageListResponse> => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (beforeId) params.set('before_id', beforeId);
  const res = await fetch(`${baseUrl}/chat/conversations/${conversationId}/messages?${params.toString()}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error('Failed to load messages');
  }
  return (await res.json()) as MessageListResponse;
};

export const sendMessage = async (
  token: string,
  conversationId: string,
  body: string,
): Promise<MessageCreatedResponse> => {
  const res = await fetch(`${baseUrl}/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.detail ?? 'Failed to send message');
  }
  return (await res.json()) as MessageCreatedResponse;
};

export const markConversationRead = async (
  token: string,
  conversationId: string,
  messageId?: string,
): Promise<ReadReceiptResponse> => {
  const res = await fetch(`${baseUrl}/chat/conversations/${conversationId}/read`, {
    method: 'POST',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ message_id: messageId ?? null }),
  });
  if (!res.ok) {
    throw new Error('Failed to mark conversation read');
  }
  return (await res.json()) as ReadReceiptResponse;
};
