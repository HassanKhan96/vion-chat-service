import { config } from "dotenv";
config();
import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { Redis } from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
import { presenceHandler } from "./handlers/userHandler";
import { authMiddleware } from "./middlewares/auth.middleware";
import { chatHandler } from "./handlers/chatHandler";

const app = express();
const httpServer = createServer(app);

const pubClient = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  lazyConnect: true,
});
const subClient = pubClient.duplicate();

pubClient.on("error", (err) => {
  console.error("pubClient error:", err);
});

subClient.on("error", (err) => {
  console.error("subClient error:", err);
});

(async () => {
  await Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
      console.log("Connected to Redis successfully");
    })
    .catch((err) => {
      console.error("Failed to connect to Redis:", err);
      process.exit(1);
    });

  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true,
    },
    adapter: createAdapter(pubClient, subClient),
  });

  const connection = (socket: Socket) => {
    console.log("new socket connected: ", socket.id);

    socket.emit("on-connection", { message: "Connection establised" });

    presenceHandler(io, socket, pubClient);
    chatHandler(io, socket, pubClient);
  };

  io.use(authMiddleware);

  io.on("connection", connection);

  subClient.subscribe("chat:new_message");
  subClient.on("message", (channel, message) => {
    if (channel === "chat:new_message") {
      const msg = JSON.parse(message);
      io.to(`user:${msg.to}`).emit("new_message", msg);
    }
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`Chat Service is running on port ${PORT}`);
  });
})();
