import { Server, Socket } from "socket.io";
import { getMyFriends } from "../respositories/friend.repository";
import Redis from "ioredis";

const userMap = new Map<string, string>();

async function countUserSockets(userId: string, io: Server): Promise<number> {
  const sockets = await io.in(`user:${userId}`).fetchSockets();
  return sockets.length;
}

export async function presenceHandler(
  io: Server,
  socket: Socket,
  redis: Redis
) {
  // get user from socket data
  let user = socket.data.user;
  if (!user || !user.id) {
    socket.disconnect();
    return;
  }

  //join your own room
  //this helps in sending direct events to the user
  socket.join(`user:${user.id}`);

  // Maintain a map of userId to socketId
  userMap.set(user.id, socket.id);

  // set Redis presence key with expiration
  await redis.set(`online:${user.id}`, "true", "EX", 60 * 5);

  // Fetch friends from the database
  const [friends, error] = await getMyFriends(user.id);
  if (error) {
    socket
      .to(`user:${user.id}`)
      .emit("error", { message: "Failed to fetch friends" });
    return;
  }

  // Notify friends about this user's online status and join their rooms
  // Also, prepare the initial presence snapshot
  const presenceSnapshot: Record<string, boolean> = {};
  for (let friend of friends.rows) {
    socket.join(`friend:${friend.id}`);
    // Check friend's online status
    const isOnline = await redis.exists(`online:${friend.id}`);
    presenceSnapshot[friend.id] = isOnline === 1;
  }
  socket
    .to(`friend:${user.id}`)
    .emit("presence", { userId: user.id, status: "online" });

  // Send initial presence snapshot to the yourself
  socket.emit("initial_presence", { onlineUsers: presenceSnapshot });

  // Handle disconnection
  socket.on("disconnect", async () => {
    // Check if user has any other active sockets
    const remaining = await countUserSockets(user.id, io);
    if (remaining === 0) {
      // delete Redis presence key
      await redis.del(`online:${user.id}`);

      // Notify friends
      io.to(`friend:${user.id}`).emit("presence", {
        userId: user.id,
        status: "offline",
      });
    }
    userMap.delete(user.id);
  });
}
