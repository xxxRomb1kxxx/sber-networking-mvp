import { Router } from 'express';
import crypto from 'node:crypto';
import {
  buildAuthorizeUrl,
  exchangeCode,
  isBusinessClient,
  createSessionToken,
  demoAccounts,
} from '../sberid.js';
import { upsertUserFromSberId } from '../db.js';
import { requireAuth } from '../middleware.js';
import { GOALS, INDUSTRIES, COMPANY_SIZES } from '../seed.js';

export const authRouter = Router();

/** Старт входа: отдаём адрес экрана «СберBusiness ID» и state. */
authRouter.post('/sberid/start', (req, res) => {
  const state = crypto.randomBytes(12).toString('hex');
  const redirectUri = req.body?.redirectUri || 'http://localhost:5173/auth/callback';
  res.json({ authorizeUrl: buildAuthorizeUrl({ state, redirectUri }), state });
});

/** Возврат с провайдера: обмен кода на токен и профиль. */
authRouter.post('/sberid/callback', (req, res) => {
  const { code, error } = req.body || {};

  if (error === 'access_denied') {
    return res
      .status(400)
      .json({ error: 'access_denied', message: 'Вход отменён: доступ к данным не подтверждён' });
  }
  if (!code) {
    return res.status(400).json({ error: 'invalid_request', message: 'Код авторизации не передан' });
  }

  let token;
  try {
    token = exchangeCode(code);
  } catch (err) {
    const messages = {
      invalid_grant: 'Код авторизации недействителен, войдите заново',
      expired_code: 'Код авторизации истёк, войдите заново',
      unknown_account: 'Аккаунт не найден в СберБизнес ID',
    };
    return res
      .status(400)
      .json({ error: err.code || 'exchange_failed', message: messages[err.code] || 'Не удалось завершить вход' });
  }

  if (!isBusinessClient(token.claims)) {
    return res.status(403).json({
      error: 'not_business_client',
      message: 'Сервис доступен только действующим клиентам СберБизнеса',
    });
  }

  const user = upsertUserFromSberId(token.claims);
  res.json({
    sessionToken: createSessionToken(user.id),
    user,
    needsOnboarding: !user.profileComplete,
  });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user, needsOnboarding: !req.user.profileComplete });
});

/** Выход: сервер хранит только токен сессии, поэтому достаточно его забыть. */
authRouter.post('/logout', (req, res) => res.json({ ok: true }));

/** Справочники для форм профиля. */
authRouter.get('/dictionaries', (req, res) => {
  res.json({ goals: GOALS, industries: INDUSTRIES, companySizes: COMPANY_SIZES });
});

/** Список демо-аккаунтов для экрана входа. */
authRouter.get('/demo-accounts', (req, res) => res.json({ accounts: demoAccounts() }));
