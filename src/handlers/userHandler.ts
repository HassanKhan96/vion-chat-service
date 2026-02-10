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
  redis: Redis,
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
  let myLastSeen = Date.now();
  await redis.set(`online:${user.id}`, "true", "EX", 60 * 5);
  await redis.set(`last_seen:${user.id}`, myLastSeen);

  socket.to(`watch:${user.id}`).emit("user_presence", {
    user_id: user.id,
    status: "online",
    lastSeen: myLastSeen,
  });

  socket.on("get_user_presence", async (targetUserId: string) => {
    socket.join(`watch:${targetUserId}`);
    let userFromMem = await redis.exists(`online:${targetUserId}`);
    let isUserOnline = userFromMem === 1;
    let userLastSeen = await redis.get(`last_seen:${targetUserId}`);

    socket.emit("user_presence", {
      user_id: targetUserId,
      status: isUserOnline ? "online" : "offline",
      lastSeen: userLastSeen,
    });
  });

  // Fetch friends from the database
  // const [friends, error] = await getMyFriends(user.id);
  // if (error) {
  //   socket
  //     .to(`user:${user.id}`)
  //     .emit("error", { message: "Failed to fetch friends" });
  //   return;
  // }

  // Notify friends about this user's online status and join their rooms
  // Also, prepare the initial presence snapshot
  // const presenceSnapshot: Record<string, boolean> = {};
  // for (let friend of friends.rows) {
  //   socket.join(`friend:${friend.id}`);
  //   // Check friend's online status
  //   const isOnline = await redis.exists(`online:${friend.id}`);
  //   presenceSnapshot[friend.id] = isOnline === 1;
  // }
  // socket
  //   .to(`friend:${user.id}`)
  //   .emit("presence", { userId: user.id, status: "online" });

  // // Send initial presence snapshot to yourself
  // socket.emit("initial_presence", { onlineUsers: presenceSnapshot });

  // Handle disconnection
  socket.on("disconnect", async () => {
    // Check if user has any other active sockets
    const remaining = await countUserSockets(user.id, io);
    if (remaining === 0) {
      let lastSeen = Date.now();
      // delete Redis presence key
      await redis.del(`online:${user.id}`);
      await redis.set(`last_seen${user.id}`, lastSeen);

      // Notify friends
      io.to(`watch:${user.id}`).emit("user_presence", {
        user_id: user.id,
        status: "offline",
        lastSeen: lastSeen,
      });
    }
    userMap.delete(user.id);
  });
}
