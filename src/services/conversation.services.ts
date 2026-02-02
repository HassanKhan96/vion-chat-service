import { getDBClient } from "../config/configs/db";
import { getConversationId } from "../helpers/conversation";
import { MessagePayload } from "../interfaces/message.interface";

export const saveMessage = async (payload: MessagePayload, from: string) => {
  const conversation_id = getConversationId(from, payload.to);
  const msg = {
    conversation_id,
    to: payload.to,
    from,
    content: payload.content,
    status: "sent",
  };

  const dbClient = await getDBClient();

  const query = `INSERT INTO conversation (conversation_id, "to", "from", content, status) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
  const params = Object.values(msg);
  return await dbClient.query(query, params);
};
