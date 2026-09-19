import { Router } from 'express';
import { requireAuth } from '../middleware.js';
import {
  listMatches,
  findMatch,
  findUser,
  listMessages,
  addMessage,
  markRead,
  db,
  uid,
} from '../db.js';
import { publicProfile } from '../matching.js';
import { isOnline, notifyMessage, notifyRead } from '../ws.js';

export const matchesRouter = Router();

matchesRouter.use(requireAuth);

function shape(match, userId) {
  const otherId = match.userIds.find((id) => id !== userId);
  const other = findUser(otherId);
  const messages = listMessages(match.id);
  const last = messages[messages.length - 1] || null;
  return {
    id: match.id,
    createdAt: match.createdAt,
    closed: Boolean(match.closedBy),
    blocked: Boolean(match.blockedBy),
    companion: other ? { ...publicProfile(other), online: isOnline(other.id) } : null,
    lastMessage: last,
    unread: messages.filter((m) => m.authorId !== userId && !m.readAt).length,
  };
}

matchesRouter.get('/', (req, res) => {
  const items = listMatches(req.user.id)
    .map((m) => shape(m, req.user.id))
    .sort((a, b) => {
      const at = a.lastMessage?.createdAt || a.createdAt;
      const bt = b.lastMessage?.createdAt || b.createdAt;
      return bt.localeCompare(at);
    });
  res.json({ matches: items });
});

function loadMatch(req, res) {
  const match = findMatch(req.params.id);
  if (!match || !match.userIds.includes(req.user.id)) {
    res.status(404).json({ error: 'not_found', message: 'Диалог не найден' });
    return null;
  }
  return match;
}

matchesRouter.get('/:id', (req, res) => {
  const match = loadMatch(req, res);
  if (!match) return;
  const read = markRead(match.id, req.user.id);
  if (read.ids.length) notifyRead(match, req.user.id, read);
  res.json({ match: shape(match, req.user.id), messages: listMessages(match.id) });
});

matchesRouter.post('/:id/messages', (req, res) => {
  const match = loadMatch(req, res);
  if (!match) return;
  if (match.closedBy || match.blockedBy) {
    return res.status(409).json({ error: 'closed', message: 'Диалог завершён' });
  }
  const text = String(req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'empty', message: 'Сообщение пустое' });
  if (text.length > 2000) {
    return res.status(400).json({ error: 'too_long', message: 'Не больше 2000 символов' });
  }

  const message = addMessage(match.id, req.user.id, text);
  notifyMessage(match, message);
  res.json({ message });
});

matchesRouter.post('/:id/close', (req, res) => {
  const match = loadMatch(req, res);
  if (!match) return;
  match.closedBy = req.user.id;
  db.save();
  res.json({ match: shape(match, req.user.id) });
});

matchesRouter.post('/:id/block', (req, res) => {
  const match = loadMatch(req, res);
  if (!match) return;
  match.blockedBy = req.user.id;
  match.closedBy = req.user.id;
  db.save();
  res.json({ match: shape(match, req.user.id) });
});

matchesRouter.post('/:id/report', (req, res) => {
  const match = loadMatch(req, res);
  if (!match) return;
  const reason = String(req.body?.reason || '').trim() || 'Без описания';
  db.data.reports.push({
    id: uid(),
    matchId: match.id,
    fromUserId: req.user.id,
    reason,
    createdAt: new Date().toISOString(),
  });
  db.save();
  res.json({ ok: true, message: 'Жалоба передана модератору' });
});
