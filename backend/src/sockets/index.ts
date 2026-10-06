import type { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Match, Message } from '../models/Interest';
import { Block } from '../models/Safety';
import { User } from '../models/User';
import { classifyMessage } from '../ai/safety';

interface AuthedSocket extends Socket { userId?: string }

/** Authenticated user identity comes only from the verified JWT, never from client-sent fields. */
async function authenticate(socket: AuthedSocket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return next(new Error('UNAUTHENTICATED'));
  try {
    const p: any = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(p.sub).select('moderationState');
    if (!user || user.moderationState !== 'active') return next(new Error('ACCOUNT_RESTRICTED'));
    socket.userId = p.sub;
    next();
  } catch { next(new Error('TOKEN_EXPIRED')); }
}

const typingTimers = new Map<string, NodeJS.Timeout>();

export function attachSockets(server: HttpServer) {
  const io = new Server(server, { cors: { origin: '*' } }); // dev-permissive; restrict origin in production

  io.use(authenticate);

  io.on('connection', (socket: AuthedSocket) => {
    socket.join(`user:${socket.userId}`);
    socket.on('joinConversation', async (matchId: string, ack?: (ok: boolean) => void) => {
      const m = await Match.findOne({ _id: matchId, users: socket.userId }); // only a participant may join
      if (!m) return ack?.(false);
      socket.join(`match:${matchId}`);
      ack?.(true);
    });

    socket.on('leaveConversation', (matchId: string) => socket.leave(`match:${matchId}`));

    socket.on('sendMessage', async (payload: { matchId: string; text: string }, ack?: (res: any) => void) => {
      const text = String(payload?.text ?? '').trim().slice(0, 2000);
      if (!text) return ack?.({ ok: false, error: 'EMPTY' });
      const m = await Match.findOne({ _id: payload.matchId, users: socket.userId });
      if (!m) return ack?.({ ok: false, error: 'NOT_FOUND' });
      const other = m.users.find((u) => String(u) !== socket.userId)!;
      if (await Block.exists({ $or: [{ blocker: socket.userId, blocked: other }, { blocker: other, blocked: socket.userId }] })) return ack?.({ ok: false, error: 'BLOCKED' });
      const msg = await Message.create({ matchId: m._id, senderId: socket.userId, text }); // sender from socket auth, not client payload
      await Match.updateOne({ _id: m._id }, { updatedAt: new Date() });
      const flag = classifyMessage(text); // shown only to the recipient; never an accusation sent to the sender or stored against them
      const out = { id: msg.id, matchId: String(m._id), senderId: socket.userId, text, at: msg.createdAt };
      socket.to(`match:${m._id}`).emit('messageReceived', flag ? { ...out, flag } : out);
      ack?.({ ok: true, id: msg.id });
    });

    socket.on('typingStart', (matchId: string) => {
      socket.to(`match:${matchId}`).emit('typingStart', { matchId, userId: socket.userId });
      clearTimeout(typingTimers.get(`${socket.userId}:${matchId}`));
      const t = setTimeout(() => socket.to(`match:${matchId}`).emit('typingStop', { matchId, userId: socket.userId }), 4000);
      typingTimers.set(`${socket.userId}:${matchId}`, t);
    });
    socket.on('typingStop', (matchId: string) => socket.to(`match:${matchId}`).emit('typingStop', { matchId, userId: socket.userId }));

    socket.on('messageSeen', async (matchId: string) => {
      const m = await Match.findOne({ _id: matchId, users: socket.userId });
      if (!m) return;
      await Message.updateMany({ matchId: m._id, senderId: { $ne: socket.userId }, seenAt: null }, { seenAt: new Date() });
      socket.to(`match:${matchId}`).emit('messageSeen', { matchId, by: socket.userId });
    });

    socket.on('disconnect', () => { /* presence/online-status tracking can hook in here later */ });
  });

  return io;
}
