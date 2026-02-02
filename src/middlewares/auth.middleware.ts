import { ExtendedError, Socket } from "socket.io";
import { verifyAuthToken } from "../helpers/auth-token";

type NextFunction = (err?: ExtendedError | undefined) => void;

export const authMiddleware = async (socket: Socket, next: NextFunction) => {
  try {
    const token = socket.handshake?.auth?.token as string;

    if (!token) {
      return next(new Error("Authentication error: Token not provided"));
    }
    const decoded = verifyAuthToken(token);
    socket.data.user = decoded;
    return next();
  } catch (error) {
    return next(new Error("Authentication error: Invalid token"));
  }
};
