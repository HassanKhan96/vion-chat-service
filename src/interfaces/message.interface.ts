export interface MessagePayload {
  to: string;
  content: string;
}

export interface Message extends MessagePayload {
  conversation_id: string;
  from: string;
  status: "pending" | "sent" | "delivered" | "seen";
}
