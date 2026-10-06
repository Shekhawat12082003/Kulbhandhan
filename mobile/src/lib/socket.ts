import { io, Socket } from 'socket.io-client';
import { tokens } from './api';

const URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';
let socket: Socket | null = null;

/** One shared socket for the app session; connect() is safe to call repeatedly. */
export async function getSocket(): Promise<Socket> {
  if (socket?.connected) return socket;
  const token = await tokens.access();
  if (!socket) socket = io(URL, { auth: { token }, autoConnect: false, transports: ['websocket'] });
  else socket.auth = { token };
  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectSocket() { socket?.disconnect(); socket = null; }
