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

    const [result, error] = await tryCatch(messagePromise);

    let msg = result?.rows[0];

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
