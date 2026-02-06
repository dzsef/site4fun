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
  const wsUrl = deriveWsUrl(token);
  const ws = new WebSocket(wsUrl);
  const pingInterval = window.setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send('ping');
    }
  }, 25_000);

  ws.onopen = () => {
    // Connection establishment event should still arrive from the server, but
    // onopen is a useful signal when debugging proxy/handshake issues.
    console.debug('Chat websocket opened', { wsUrl });
  };

  ws.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data) as ChatEvent;
      onEvent(payload);
    } catch (error) {
      console.error('Failed to parse chat event', error);
    }
  };

  ws.onerror = (event) => {
    console.error('Chat websocket error', { wsUrl, event });
    onError?.(event);
  };

  ws.onclose = (event) => {
    window.clearInterval(pingInterval);
    console.warn('Chat websocket closed', {
      wsUrl,
      wasClean: event.wasClean,
      code: event.code,
      reason: event.reason,
    });
    // Only surface an error UI if the close was not a normal shutdown.
    if (event.code !== 1000) {
      onError?.(event);
    }
  };

  return {
    close: () => {
      window.clearInterval(pingInterval);
      ws.close();
    },
  };
};
