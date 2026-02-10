import { getDBClient } from "../config/configs/db";
import { getConversationId } from "../helpers/conversation";
import { CustomError, QueryError } from "../helpers/error";
import { tryCatch } from "../helpers/tryCatch.helper";
import {
  MessagePayload,
  ReadMessagePayload,
} from "../interfaces/message.interface";

export const saveMessage = async (payload: MessagePayload, from: string) => {
  const client = await getDBClient();
  const conversation_id = getConversationId(from, payload.to);

  const conversation_query = `
    INSERT INTO conversations (id, type, created_at)
    VALUES ($1, 'direct', NOW())
    ON CONFLICT (id) DO NOTHING;
  `;

  let conversation_promise = client.query(conversation_query, [
    conversation_id,
  ]);
  let [conversation_result, conversation_error] =
    await tryCatch(conversation_promise);

  if (conversation_error) {
    console.log("conversation error: ", conversation_error);
    throw new QueryError("Unable to create conversation");
  }

  const participant_query = `
    INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
    VALUES
    ($1, $2, NOW()),
    ($1, $3, NOW())
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  `;

  let participant_promise = client.query(participant_query, [
    conversation_id,
    from,
    payload.to,
  ]);
  let [participant_result, participant_error] =
    await tryCatch(participant_promise);

  if (participant_error) {
    console.log("participant error: ", participant_error);
    throw new QueryError("Unable to create participants");
  }

  const messageQuery = `
   INSERT INTO messages(conversation_id, sender_id, content, created_at)
   VALUES ($1, $2, $3, $4) RETURNING *
  `;

  let message_promise = client.query(messageQuery, [
    conversation_id,
    from,
    payload.content,
    new Date(payload.created_at),
  ]);
  let [message_result, message_error] = await tryCatch(message_promise);

  let message = message_result?.rows?.[0];

  if (message_error) {
    console.log("message error: ", message_error);
    throw new QueryError("Unable to save message");
  }

  let msg = {
    id: message.id,
    conversation_id: message.conversation_id,
    sender_id: from,
    to: payload.to,
    content: payload.content,
    status: "sent",
    sender: "them",
    created_at: payload.created_at,
  };

  return msg;
};

export const markMessagesRead = async (payload: ReadMessagePayload) => {
  const client = await getDBClient();

  const query = `
  UPDATE messages
  SET status = 'read'
  WHERE conversation_id = $1 AND sender_id = $2
  `;

  const promise = client.query(query, [
    payload.conversation_id,
    payload.sender_id,
  ]);

  return await tryCatch(promise);
};
