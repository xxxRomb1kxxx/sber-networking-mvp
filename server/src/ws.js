/**
 * Real-time слой на Socket.IO: онлайн-статусы, доставка сообщений,
 * статус «прочитано», индикатор набора текста.
 */
import { Server } from 'socket.io';
import { readSessionToken } from './sberid.js';
import { findUser, findMatch, listMatches, addMessage, markRead } from './db.js';
import { config } from './config.js';

let io = null;
const sockets = new Map(); // userId -> Set<socketId>

export function isOnline(userId) {
  return sockets.has(userId) && sockets.get(userId).size > 0;
}

function room(userId) {
  return `user:${userId}`;
}

export function initWs(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: config.clientOrigin, credentials: true },
  });

  io.use((socket, next) => {
    const payload = readSessionToken(socket.handshake.auth?.token);
    if (!payload) return next(new Error('unauthorized'));
    const user = findUser(payload.sub);
    if (!user) return next(new Error('unauthorized'));
    socket.data.userId = user.id;
    next();
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    if (!sockets.has(userId)) sockets.set(userId, new Set());
    sockets.get(userId).add(socket.id);
    socket.join(room(userId));
    broadcastPresence(userId, true);

    socket.on('message:send', ({ matchId, text }, ack) => {
      const match = findMatch(matchId);
      const body = String(text || '').trim();
      if (!match || !match.userIds.includes(userId) || !body) return ack?.({ ok: false });
      if (match.closedBy || match.blockedBy) return ack?.({ ok: false, error: 'closed' });
      const message = addMessage(matchId, userId, body.slice(0, 2000));
      notifyMessage(match, message);
      ack?.({ ok: true, message });
    });

    socket.on('message:read', ({ matchId }) => {
      const match = findMatch(matchId);
      if (!match || !match.userIds.includes(userId)) return;
      const read = markRead(matchId, userId);
      if (read.ids.length) notifyRead(match, userId, read);
    });

    socket.on('typing', ({ matchId, typing }) => {
      const match = findMatch(matchId);
      if (!match || !match.userIds.includes(userId)) return;
      const otherId = match.userIds.find((id) => id !== userId);
      io.to(room(otherId)).emit('typing', { matchId, userId, typing: Boolean(typing) });
    });

    socket.on('disconnect', () => {
      const set = sockets.get(userId);
      set?.delete(socket.id);
      if (set && set.size === 0) {
        sockets.delete(userId);
        broadcastPresence(userId, false);
      }
    });
  });

  return io;
}

/** Сообщаем собеседникам из активных мэтчей об изменении статуса. */
function broadcastPresence(userId, online) {
  if (!io) return;
  for (const match of listMatches(userId)) {
    const otherId = match.userIds.find((id) => id !== userId);
    io.to(room(otherId)).emit('presence', { userId, online });
  }
}

export function notifyMessage(match, message) {
  if (!io) return;
  for (const id of match.userIds) {
    io.to(room(id)).emit('message', { matchId: match.id, message });
  }
}

export function notifyRead(match, readerId, read) {
  if (!io) return;
  for (const id of match.userIds) {
    io.to(room(id)).emit('message:read', {
      matchId: match.id,
      readerId,
      ids: read.ids,
      readAt: read.readAt,
    });
  }
}

export function notifyMatch(match) {
  if (!io) return;
  for (const id of match.userIds) {
    io.to(room(id)).emit('match', { matchId: match.id });
  }
}
