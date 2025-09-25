import type { ChatEvent } from '../types/chat';

const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const deriveWsUrl = (token: string): string => {
  const local = baseUrl.startsWith('http') ? baseUrl : window.location.origin + baseUrl;
  const url = new URL(local, window.location.origin);
  url.pathname = `${url.pathname.replace(/\/$/, '')}/chat/ws`;
  url.searchParams.set('token', token);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
};

export type ChatSocket = {
  close: () => void;
};

export const openChatSocket = (
  token: string,
  onEvent: (event: ChatEvent) => void,
  onError?: (error: Event) => void,
): ChatSocket => {
  const ws = new WebSocket(deriveWsUrl(token));

  ws.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data) as ChatEvent;
      onEvent(payload);
    } catch (error) {
      console.error('Failed to parse chat event', error);
    }
  };

  ws.onerror = (event) => {
    console.error('Chat websocket error', event);
    onError?.(event);
  };

  return {
    close: () => {
      ws.close();
    },
  };
};
