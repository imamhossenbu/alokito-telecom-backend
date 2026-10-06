import { Server as SocketServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { verifyAccessToken } from "../shared/utils/jwt";
import { logger } from "./logger";

// Extend the Socket interface to include custom properties
export interface AuthenticatedSocket extends Socket {
  userId?: string;
  role?: string;
}

let io: SocketServer | null = null;

export function initSocketServer(server: HttpServer): SocketServer {
  logger.info("Initializing Socket.io server...");
  io = new SocketServer(server, {
    cors: {
      origin: "*", // Supports connections from any client
      methods: ["GET", "POST"],
    },
  });

  // Authentication Middleware for connection handshake
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token || typeof token !== "string") {
      logger.warn("Socket connection rejected: Missing token");
      return next(new Error("Authentication error: Missing token"));
    }

    try {
      const payload = verifyAccessToken(token);
      socket.userId = payload.sub;
      socket.role = payload.type;
      logger.info({ userId: socket.userId, role: socket.role }, "Socket authenticated successfully");
      next();
    } catch (err) {
      logger.warn({ err }, "Socket connection rejected: Invalid token");
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    if (!socket.userId) return;

    // Join a room named after the userId to allow direct targeting
    socket.join(socket.userId);
    logger.info({ userId: socket.userId, socketId: socket.id }, "Socket connected and joined user room");

    // If socket is an administrator, join the admins room
    if (socket.role === "ADMIN" || socket.role === "SUPER_ADMIN" || socket.role === "MODERATOR") {
      socket.join("admins");
      logger.info({ userId: socket.userId, role: socket.role }, "Socket joined admins room");
    }

    socket.on("disconnect", () => {
      logger.info({ userId: socket.userId, socketId: socket.id }, "Socket disconnected");
    });
  });

  return io;
}

/**
 * Emit a real-time event to a specific user's room.
 * Supports multiple concurrent active devices/connections for the same user.
 */
export function sendRealTimeNotification(userId: string, data: any): void {
  if (io) {
    logger.info({ userId }, "Broadcasting real-time notification to user");
    io.to(userId).emit("new_notification", data);
  } else {
    logger.warn("Socket.io server not initialized. Cannot broadcast real-time notification.");
  }
}

/**
 * Broadcast an event to all connected administrators.
 */
export function broadcastToAdmins(event: string, data: any): void {
  if (io) {
    logger.info({ event }, "Broadcasting real-time event to all admins");
    io.to("admins").emit(event, data);
    // Also explicitly emit to any socket with admin role
    for (const [_, sock] of io.sockets.sockets) {
      const authSock = sock as AuthenticatedSocket;
      if (authSock.role === "ADMIN" || authSock.role === "SUPER_ADMIN" || authSock.role === "MODERATOR") {
        authSock.emit(event, data);
      }
    }
  } else {
    logger.warn("Socket.io server not initialized. Cannot broadcast to admins.");
  }
}

export { io };
