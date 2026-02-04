import Redis from "ioredis";
import { Server, Socket } from "socket.io";
import { MessagePayload } from "../interfaces/message.interface";
import { saveMessage } from "../services/conversation.services";
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
      socket.emit("message_error", "Unable to send message");
      return;
    }

    socket.emit("message_sent", {
      tempId: payload.id,
      status: msg.status,
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
}
