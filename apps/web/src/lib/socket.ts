import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const serverUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const token = localStorage.getItem('nextday_token');

    socket = io(serverUrl, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('⚡ Connected to NextDay Real-Time Gateway');
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from Real-Time Gateway');
    });
  }

  return socket;
}

export function updateSocketAuth(token: string | null) {
  if (socket) {
    socket.auth = { token };
    socket.disconnect().connect();
  }
}
