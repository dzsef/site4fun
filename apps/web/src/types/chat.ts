export type ConversationType = 'contractor_subcontractor';

export type MessageContentType = 'text' | 'image' | 'file' | 'system';

export type ConversationCounterparty = {
  user_id: number;
  role: string;
  name: string | null;
  avatar_url: string | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: number;
  body: string;
  content_type: MessageContentType;
  attachment_url: string | null;
  created_at: string;
  read_at: string | null;
};

export type ConversationSummary = {
  id: string;
  type: ConversationType;
  counterpart: ConversationCounterparty;
  last_message: Message | null;
  unread_count: number;
  updated_at: string;
};

export type ConversationListResponse = {
  conversations: ConversationSummary[];
};

export type ConversationCreatedResponse = {
  conversation: ConversationSummary;
};

export type MessageListResponse = {
  messages: Message[];
  has_more: boolean;
};

export type MessageCreatedResponse = {
  message: Message;
};

export type ReadReceiptResponse = {
  conversation_id: string;
  last_read_message_id: string | null;
  unread_count: number;
  read_at: string;
};

export type ChatEvent =
  | { event: 'connection.established' }
  | { event: 'conversation.created'; conversation: ConversationSummary }
  | { event: 'message.created'; message: Message }
  | {
      event: 'conversation.read';
      conversation_id: string;
      user_id: number;
      message_id: string | null;
    };
