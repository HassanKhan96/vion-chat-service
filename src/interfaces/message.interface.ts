export interface MessagePayload {
  id: string;
  to: string;
  content: string;
  created_at: number;
}

export interface Message extends MessagePayload {
  from: string;
  status: "pending" | "sent" | "delivered" | "seen";
}
