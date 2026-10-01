/**
 * Демо-хранилище.
 *
 * В боевой версии здесь PostgreSQL (профили, мэтчи, сообщения) + Redis (кэш,
 * сессии, presence). Для демо всё лежит в одном JSON-файле, чтобы репозиторий
 * запускался одной командой и без внешних сервисов.
 *
 * Весь доступ к данным идёт через функции ниже — при переходе на Postgres
 * меняется только этот файл.
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { buildSeed } from './seed.js';
import { buildEvents, buildEventSeed } from './events.js';

const empty = {
  users: [],
  likes: [], // { fromUserId, toUserId, value: 'like' | 'skip', createdAt }
  matches: [], // { id, userIds: [a, b], createdAt, closedBy, blockedBy }
  messages: [], // { id, matchId, authorId, text, createdAt, readAt }
  reports: [], // { id, matchId, fromUserId, reason, createdAt }
  matchCache: [], // { userId, queryHash, items, createdAt, source }
  authCodes: [], // { code, sberId, createdAt }
  events: [], // { id, title, startsAt, endsAt, seats, hostId, ... }
  eventRegistrations: [], // { id, eventId, userId, seatNo, createdAt }
  eventMessages: [], // { id, eventId, authorId, text, createdAt }
};

let state = null;
let writeTimer = null;

function seedAll(target) {
  target.users = buildSeed();
  const events = buildEventSeed();
  target.events = buildEvents();
  target.eventRegistrations = events.registrations;
  target.eventMessages = events.messages;
  return target;
}

function load() {
  if (state) return state;
  try {
    const raw = fs.readFileSync(config.dbFile, 'utf8');
    state = { ...structuredClone(empty), ...JSON.parse(raw) };
    // База из прошлой версии — мероприятий в ней ещё нет, добираем их отдельно,
    // чтобы не терять уже накопленные профили, мэтчи и переписку.
    if (!state.events.length) {
      const seeded = seedAll({});
      state.events = seeded.events;
      state.eventRegistrations = seeded.eventRegistrations;
      state.eventMessages = seeded.eventMessages;
      persistNow();
    }
  } catch {
    state = seedAll(structuredClone(empty));
    persistNow();
  }
  return state;
}

function persistNow() {
  fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });
  fs.writeFileSync(config.dbFile, JSON.stringify(state, null, 2), 'utf8');
}

/** Отложенная запись на диск — чтобы не писать файл на каждое сообщение. */
function persist() {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(persistNow, 120);
}

export const db = {
  get data() {
    return load();
  },
  save: persist,
  saveNow: persistNow,
  reset() {
    state = seedAll(structuredClone(empty));
    persistNow();
    return state;
  },
};

export const uid = () => crypto.randomUUID();

// --- Пользователи -----------------------------------------------------------

export function findUserBySberId(sberId) {
  return db.data.users.find((u) => u.sberId === sberId) || null;
}

export function findUser(id) {
  return db.data.users.find((u) => u.id === id) || null;
}

export function upsertUserFromSberId(claims) {
  const existing = findUserBySberId(claims.sub);
  if (existing) {
    // Поля из СберБизнес ID всегда перетираются провайдером.
    Object.assign(existing, {
      fullName: claims.name,
      position: claims.position,
      company: claims.company,
      inn: claims.inn,
      companyStatus: claims.company_status,
      lastLoginAt: new Date().toISOString(),
    });
    db.save();
    return existing;
  }
  const user = {
    id: uid(),
    sberId: claims.sub,
    fullName: claims.name,
    position: claims.position,
    company: claims.company,
    inn: claims.inn,
    companyStatus: claims.company_status,
    industry: claims.industry || '',
    companySize: claims.company_size || '',
    region: claims.region || '',
    goals: [],
    tags: [],
    about: '',
    request: '',
    avatar: null,
    privacy: { showCompany: true, showPosition: true, showRegion: true },
    profileComplete: false,
    isSeed: false,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };
  db.data.users.push(user);
  db.save();
  return user;
}

export function updateUser(id, patch) {
  const user = findUser(id);
  if (!user) return null;
  Object.assign(user, patch);
  db.save();
  return user;
}

// --- Лайки и мэтчи ----------------------------------------------------------

export function getDecision(fromUserId, toUserId) {
  return db.data.likes.find((l) => l.fromUserId === fromUserId && l.toUserId === toUserId) || null;
}

export function saveDecision(fromUserId, toUserId, value) {
  const existing = getDecision(fromUserId, toUserId);
  if (existing) {
    existing.value = value;
    existing.createdAt = new Date().toISOString();
  } else {
    db.data.likes.push({ fromUserId, toUserId, value, createdAt: new Date().toISOString() });
  }
  db.save();
}

export function findMatchBetween(a, b) {
  return (
    db.data.matches.find((m) => m.userIds.includes(a) && m.userIds.includes(b)) || null
  );
}

export function createMatch(a, b) {
  const match = {
    id: uid(),
    userIds: [a, b],
    createdAt: new Date().toISOString(),
    closedBy: null,
    blockedBy: null,
  };
  db.data.matches.push(match);
  db.save();
  return match;
}

export function listMatches(userId) {
  return db.data.matches.filter((m) => m.userIds.includes(userId));
}

export function findMatch(id) {
  return db.data.matches.find((m) => m.id === id) || null;
}

// --- Сообщения --------------------------------------------------------------

export function listMessages(matchId) {
  return db.data.messages
    .filter((m) => m.matchId === matchId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function addMessage(matchId, authorId, text) {
  const message = {
    id: uid(),
    matchId,
    authorId,
    text,
    createdAt: new Date().toISOString(),
    readAt: null,
  };
  db.data.messages.push(message);
  db.save();
  return message;
}

export function markRead(matchId, readerId) {
  const now = new Date().toISOString();
  const updated = [];
  for (const m of db.data.messages) {
    if (m.matchId === matchId && m.authorId !== readerId && !m.readAt) {
      m.readAt = now;
      updated.push(m.id);
    }
  }
  if (updated.length) db.save();
  return { ids: updated, readAt: now };
}

// --- Кэш подбора ------------------------------------------------------------

export function getCachedMatching(userId, queryHash) {
  return db.data.matchCache.find((c) => c.userId === userId && c.queryHash === queryHash) || null;
}

export function setCachedMatching(userId, queryHash, items, source) {
  const existing = getCachedMatching(userId, queryHash);
  if (existing) {
    Object.assign(existing, { items, source, createdAt: new Date().toISOString() });
  } else {
    db.data.matchCache.push({
      userId,
      queryHash,
      items,
      source,
      createdAt: new Date().toISOString(),
    });
  }
  db.save();
}

/** Профиль или запрос изменились — прошлый подбор больше не актуален. */
export function dropCache(userId) {
  db.data.matchCache = db.data.matchCache.filter((c) => c.userId !== userId);
  db.save();
}

// --- Мероприятия ------------------------------------------------------------

export function listEvents() {
  return [...db.data.events].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function findEvent(id) {
  return db.data.events.find((e) => e.id === id) || null;
}

export function listRegistrations(eventId) {
  return db.data.eventRegistrations
    .filter((r) => r.eventId === eventId)
    .sort((a, b) => a.seatNo - b.seatNo);
}

export function findRegistration(eventId, userId) {
  return (
    db.data.eventRegistrations.find((r) => r.eventId === eventId && r.userId === userId) || null
  );
}

/**
 * Занять место. Слот достаётся тому, кто пришёл раньше: номер места — это
 * следующий свободный номер, повторно он не выдаётся, пока место не освободят.
 *
 * В боевой версии это транзакция с блокировкой строки мероприятия
 * (`SELECT ... FOR UPDATE`): здесь один процесс и синхронный код, поэтому
 * гонки за последнее место не возникает.
 */
export function takeSeat(event, userId) {
  const existing = findRegistration(event.id, userId);
  if (existing) return { registration: existing, created: false };

  const taken = listRegistrations(event.id);
  if (taken.length >= event.seats) return { registration: null, created: false, full: true };

  const used = new Set(taken.map((r) => r.seatNo));
  let seatNo = 1;
  while (used.has(seatNo)) seatNo += 1;

  const registration = {
    id: uid(),
    eventId: event.id,
    userId,
    seatNo,
    createdAt: new Date().toISOString(),
  };
  db.data.eventRegistrations.push(registration);
  db.save();
  return { registration, created: true };
}

export function releaseSeat(eventId, userId) {
  const before = db.data.eventRegistrations.length;
  db.data.eventRegistrations = db.data.eventRegistrations.filter(
    (r) => !(r.eventId === eventId && r.userId === userId)
  );
  const released = db.data.eventRegistrations.length !== before;
  if (released) db.save();
  return released;
}

export function listEventMessages(eventId) {
  return db.data.eventMessages
    .filter((m) => m.eventId === eventId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function addEventMessage(eventId, authorId, text) {
  const message = {
    id: uid(),
    eventId,
    authorId,
    text,
    createdAt: new Date().toISOString(),
  };
  db.data.eventMessages.push(message);
  db.save();
  return message;
}
