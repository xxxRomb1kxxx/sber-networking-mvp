import { Router } from 'express';
import { requireAuth } from '../middleware.js';
import {
  listEvents,
  findEvent,
  listRegistrations,
  findRegistration,
  takeSeat,
  releaseSeat,
  listEventMessages,
  addEventMessage,
  findUser,
} from '../db.js';
import { publicProfile } from '../matching.js';
import { notifyEventSeats, notifyEventMessage, isOnline } from '../ws.js';

export const eventsRouter = Router();

eventsRouter.use(requireAuth);

/** Карточка мероприятия для списка: места, регистрация, ведущий. */
function shape(event, userId) {
  const registrations = listRegistrations(event.id);
  const mine = registrations.find((r) => r.userId === userId) || null;
  const host = findUser(event.hostId);
  const seatsTaken = registrations.length;
  const isHost = event.hostId === userId;

  return {
    id: event.id,
    title: event.title,
    summary: event.summary,
    format: event.format,
    place: event.place,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    topics: event.topics,
    seats: event.seats,
    seatsTaken,
    seatsLeft: Math.max(0, event.seats - seatsTaken),
    registered: Boolean(mine),
    seatNo: mine?.seatNo ?? null,
    past: new Date(event.endsAt) < new Date(),
    isHost,
    // Ведущий не занимает место, но чат своей встречи ведёт он.
    canChat: Boolean(mine) || isHost,
    host: host ? { ...publicProfile(host), online: isOnline(host.id) } : null,
  };
}

/** Доступ к чату: занятое место или роль ведущего. */
function canChat(event, userId) {
  return event.hostId === userId || Boolean(findRegistration(event.id, userId));
}

eventsRouter.get('/', (req, res) => {
  const events = listEvents().map((e) => shape(e, req.user.id));
  res.json({
    events,
    registeredCount: events.filter((e) => e.registered && !e.past).length,
  });
});

function loadEvent(req, res) {
  const event = findEvent(req.params.id);
  if (!event) {
    res.status(404).json({ error: 'not_found', message: 'Мероприятие не найдено' });
    return null;
  }
  return event;
}

eventsRouter.get('/:id', (req, res) => {
  const event = loadEvent(req, res);
  if (!event) return;

  const card = shape(event, req.user.id);
  const participants = listRegistrations(event.id)
    .map((r) => {
      const user = findUser(r.userId);
      return user ? { ...publicProfile(user), seatNo: r.seatNo, online: isOnline(user.id) } : null;
    })
    .filter(Boolean);

  res.json({
    event: { ...card, description: event.description, agenda: event.agenda },
    participants,
    // Чат — площадка участников: читают его те, кто занял место, и ведущий.
    messages: card.canChat ? listEventMessages(event.id) : [],
  });
});

/** Регистрация: место достаётся тому, кто нажал раньше. */
eventsRouter.post('/:id/register', (req, res) => {
  const event = loadEvent(req, res);
  if (!event) return;

  if (new Date(event.endsAt) < new Date()) {
    return res.status(409).json({ error: 'past', message: 'Мероприятие уже прошло' });
  }

  const { registration, created, full } = takeSeat(event, req.user.id);
  if (full) {
    return res.status(409).json({
      error: 'no_seats',
      message: 'Мест не осталось — их заняли раньше. Откроем набор, если кто-то освободит слот.',
    });
  }

  const card = shape(event, req.user.id);
  if (created) notifyEventSeats(event.id, card.seatsTaken, card.seats);
  res.json({ event: card, seatNo: registration.seatNo });
});

eventsRouter.post('/:id/cancel', (req, res) => {
  const event = loadEvent(req, res);
  if (!event) return;
  if (!findRegistration(event.id, req.user.id)) {
    return res.status(409).json({ error: 'not_registered', message: 'Вы не записаны' });
  }

  releaseSeat(event.id, req.user.id);
  const card = shape(event, req.user.id);
  notifyEventSeats(event.id, card.seatsTaken, card.seats);
  res.json({ event: card });
});

/** Сообщение в чат мероприятия (фолбэк, когда WebSocket недоступен). */
eventsRouter.post('/:id/messages', (req, res) => {
  const event = loadEvent(req, res);
  if (!event) return;
  if (!canChat(event, req.user.id)) {
    return res.status(403).json({
      error: 'not_registered',
      message: 'Чат открыт участникам — займите место, чтобы написать',
    });
  }

  const text = String(req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'empty', message: 'Сообщение пустое' });
  if (text.length > 2000) {
    return res.status(400).json({ error: 'too_long', message: 'Не больше 2000 символов' });
  }

  const message = addEventMessage(event.id, req.user.id, text);
  notifyEventMessage(event.id, message);
  res.json({ message });
});
