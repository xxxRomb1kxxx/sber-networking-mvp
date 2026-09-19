import { Router } from 'express';
import { requireAuth } from '../middleware.js';
import { buildFeed, publicProfile } from '../matching.js';
import {
  saveDecision,
  getDecision,
  findMatchBetween,
  createMatch,
  findUser,
  addMessage,
} from '../db.js';
import { config } from '../config.js';
import { notifyMatch, notifyMessage } from '../ws.js';

export const feedRouter = Router();

feedRouter.use(requireAuth);

feedRouter.get('/', async (req, res) => {
  if (!req.user.profileComplete) {
    return res.status(409).json({
      error: 'profile_incomplete',
      message: 'Заполните профиль и запрос — без них ИИ не сможет подобрать кандидатов',
    });
  }
  if (!req.user.request?.trim()) {
    return res.status(409).json({
      error: 'request_empty',
      message: 'Сформулируйте, кого вы ищете — по этому тексту идёт подбор',
    });
  }

  const result = await buildFeed(req.user, { refresh: req.query.refresh === '1' });
  res.json(result);
});

/** Лайк или скип кандидата. */
feedRouter.post('/decision', (req, res) => {
  const { toUserId, value } = req.body || {};
  if (!['like', 'skip'].includes(value)) {
    return res.status(400).json({ error: 'bad_value', message: 'Ожидается like или skip' });
  }
  const candidate = findUser(toUserId);
  if (!candidate || candidate.id === req.user.id) {
    return res.status(404).json({ error: 'not_found', message: 'Кандидат не найден' });
  }

  saveDecision(req.user.id, toUserId, value);

  if (value === 'skip') return res.json({ match: null });

  const existing = findMatchBetween(req.user.id, toUserId);
  if (existing) return res.json({ match: withCompanion(existing, req.user.id) });

  // Ответный лайк. Для демо-профилей он имитируется, для живых пользователей —
  // берётся реальное решение из базы.
  const theirDecision = getDecision(toUserId, req.user.id);
  const likesBack = candidate.isSeed
    ? Math.random() < config.mock.autoLikeBackRate
    : theirDecision?.value === 'like';

  if (!likesBack) return res.json({ match: null });

  if (candidate.isSeed) saveDecision(toUserId, req.user.id, 'like');
  const match = createMatch(req.user.id, toUserId);
  notifyMatch(match);

  // Демо-профиль здоровается первым, чтобы чат не был пустым.
  if (candidate.isSeed && config.mock.autoReplyDelayMs > 0) {
    setTimeout(() => {
      const message = addMessage(
        match.id,
        candidate.id,
        greeting(candidate, req.user)
      );
      notifyMessage(match, message);
    }, config.mock.autoReplyDelayMs);
  }

  res.json({ match: withCompanion(match, req.user.id) });
});

function greeting(candidate, user) {
  const name = user.fullName.split(' ')[0];
  return `${name}, здравствуйте! Посмотрел ваш профиль — похоже, нам есть что обсудить. Расскажите подробнее, что нужно с вашей стороны?`;
}

function withCompanion(match, userId) {
  const otherId = match.userIds.find((id) => id !== userId);
  const other = findUser(otherId);
  return { ...match, companion: other ? publicProfile(other) : null };
}
