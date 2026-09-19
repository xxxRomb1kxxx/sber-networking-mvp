import { readSessionToken } from './sberid.js';
import { findUser } from './db.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = readSessionToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'session_expired', message: 'Сессия истекла, войдите заново' });
  }
  const user = findUser(payload.sub);
  if (!user) {
    return res.status(401).json({ error: 'user_not_found', message: 'Пользователь не найден' });
  }
  req.user = user;
  next();
}
