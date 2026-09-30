import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './env.js';

let io;

export function configureSocket(httpServer) {
  io = new Server(httpServer, { cors: { origin: env.clientUrl, credentials: true } });
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next();
    try {
      socket.user = jwt.verify(token, env.jwtSecret);
      next();
    } catch {
      next(new Error('AUTH_EXPIRED'));
    }
  });
  return io;
}

export function emitToUser(userId, event, payload) {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function getSocketServer() {
  return io;
}

export function joinUserRoom(socket) {
  if (socket.user?.id) socket.join(`user:${socket.user.id}`);
}