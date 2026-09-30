import { io } from 'socket.io-client';

export function connectSocket(token) {
  return io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000', {
    auth: { token },
    transports: ['websocket', 'polling'],
  });
}