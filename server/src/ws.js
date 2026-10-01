/**
 * Real-time слой на Socket.IO: онлайн-статусы, доставка сообщений,
 * статус «прочитано», индикатор набора текста.
 */
import { Server } from 'socket.io';
import { readSessionToken } from './sberid.js';
import {
  findUser,
  findMatch,
  listMatches,
  addMessage,
  markRead,
  findRegistration,
  addEventMessage,
  findEvent,
} from './db.js';
import { config } from './config.js';

let io = null;
const sockets = new Map(); // userId -> Set<socketId>

export function isOnline(userId) {
  return sockets.has(userId) && sockets.get(userId).size > 0;
}

function room(userId) {
  return `user:${userId}`;
}

function eventRoom(eventId) {
  return `event:${eventId}`;
}

/** Писать и читать чат встречи могут участники и ведущий. */
function canChat(eventId, userId) {
  const event = findEvent(eventId);
  if (!event) return false;
  return event.hostId === userId || Boolean(findRegistration(eventId, userId));
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

    // --- Чат мероприятия: общая комната для тех, кто занял место -------------

    socket.on('event:join', ({ eventId }) => {
      if (!eventId || !canChat(eventId, userId)) return;
      socket.join(eventRoom(eventId));
    });

    socket.on('event:leave', ({ eventId }) => {
      if (eventId) socket.leave(eventRoom(eventId));
    });

    socket.on('event:message', ({ eventId, text }, ack) => {
      const body = String(text || '').trim();
      if (!eventId || !body) return ack?.({ ok: false });
      if (!canChat(eventId, userId)) return ack?.({ ok: false, error: 'not_registered' });
      const message = addEventMessage(eventId, userId, body.slice(0, 2000));
      notifyEventMessage(eventId, message);
      ack?.({ ok: true, message });
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

export function notifyEventMessage(eventId, message) {
  if (!io) return;
  io.to(eventRoom(eventId)).emit('event:message', { eventId, message });
}

/** Счётчик мест меняется у всех, кто сейчас смотрит раздел мероприятий. */
export function notifyEventSeats(eventId, seatsTaken, seats) {
  if (!io) return;
  io.emit('event:seats', { eventId, seatsTaken, seats });
}
