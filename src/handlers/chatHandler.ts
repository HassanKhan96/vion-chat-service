import Redis from "ioredis";
import { Server, Socket } from "socket.io";
import {
  MessagePayload,
  ReadMessagePayload,
} from "../interfaces/message.interface";
import {
  markMessagesRead,
  saveMessage,
} from "../services/conversation.services";
import { tryCatch } from "../helpers/tryCatch.helper";

export async function chatHandler(io: Server, socket: Socket, redisPub: Redis) {
  const user = socket.data.user;
  if (!user || !user.id) {
    return;
  }

  socket.on("send_message", async (payload: MessagePayload) => {
    const messagePromise = saveMessage(payload, user.id);

    const [msg, error] = await tryCatch(messagePromise);

    if (error) {
      //handle message save error here
      console.log(error);
      socket.emit("message_error", "Unable to send message");
      return;
    }

    socket.emit("message_sent", {
      temp_id: payload.id,
      conversation_id: msg.conversation_id,
      id: msg.id,
      status: msg.status,
      content: msg.content,
      created_at: msg.created_at,
      error: error ? "Failed to send message" : null,
    });

    await redisPub
      .publish(`chat:new_message`, JSON.stringify(msg))
      .then(() => {
        console.log("published message to redis");
      })
      .catch((err) => {
        console.error("failed to publish message to redis", err);
      });
  });

  socket.on("mark_messages_read", async (payload: ReadMessagePayload) => {
    const [result, error] = await markMessagesRead(payload);

    if (error) {
      console.log(error);
    }

    socket
      .to(`user:${payload.sender_id}`)
      .emit("messages_read", { conversation_id: payload.conversation_id });
  });
}
