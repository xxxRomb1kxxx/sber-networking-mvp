/**
 * Имитация SberBusiness ID (OAuth2 / OIDC).
 *
 * Реальных сетевых вызовов нет. Внутри — локальный «провайдер»: экран согласия,
 * выдача кода, обмен кода на токен, userinfo. Клиентская часть приложения
 * ходит по тем же шагам, что и с настоящим SberBusiness ID, поэтому при
 * подключении боевого провайдера меняются только URL и секреты.
 */
import crypto from 'node:crypto';
import { db } from './db.js';
import { config } from './config.js';

const ACCOUNT_STATUS = {
  active: 'Активный клиент СберБизнеса',
  blocked: 'Доступ к сервису закрыт',
};

/** Аккаунты, доступные на экране имитации входа. */
export function demoAccounts() {
  return db.data.users
    .filter((u) => u.isSeed)
    .slice(0, 6)
    .map((u) => ({
      sberId: u.sberId,
      fullName: u.fullName,
      position: u.position,
      company: u.company,
      inn: u.inn,
      photo: u.photo || null,
      avatarColor: u.avatarColor,
    }));
}

/** Шаг 1: адрес экрана авторизации провайдера. */
export function buildAuthorizeUrl({ state, redirectUri }) {
  const params = new URLSearchParams({
    client_id: 'sber-networking-mvp',
    response_type: 'code',
    scope: 'openid profile business_account',
    state,
    redirect_uri: redirectUri,
  });
  return `/mock/sberid/authorize?${params.toString()}`;
}

/** Шаг 2: пользователь подтвердил вход — провайдер выдаёт одноразовый код. */
export function issueCode(sberId) {
  const code = crypto.randomBytes(16).toString('hex');
  db.data.authCodes.push({ code, sberId, createdAt: Date.now() });
  db.save();
  return code;
}

/** Шаг 3: обмен кода на токен и claims (эмулирует /token + /userinfo). */
export function exchangeCode(code) {
  const idx = db.data.authCodes.findIndex((c) => c.code === code);
  if (idx === -1) {
    const err = new Error('invalid_grant');
    err.code = 'invalid_grant';
    throw err;
  }
  const entry = db.data.authCodes[idx];
  db.data.authCodes.splice(idx, 1);
  db.save();

  // Код живёт 5 минут — как у настоящего провайдера.
  if (Date.now() - entry.createdAt > 5 * 60 * 1000) {
    const err = new Error('expired_code');
    err.code = 'expired_code';
    throw err;
  }

  const source = db.data.users.find((u) => u.sberId === entry.sberId);
  if (!source) {
    const err = new Error('unknown_account');
    err.code = 'unknown_account';
    throw err;
  }

  return {
    access_token: `mock.${crypto.randomBytes(12).toString('hex')}`,
    token_type: 'Bearer',
    expires_in: 3600,
    claims: {
      sub: source.sberId,
      name: source.fullName,
      position: source.position,
      company: source.company,
      inn: source.inn,
      company_status: 'active',
      industry: source.industry,
      company_size: source.companySize,
      region: source.region,
    },
  };
}

export function isBusinessClient(claims) {
  return claims.company_status === 'active' && Boolean(claims.inn);
}

export const accountStatusText = ACCOUNT_STATUS;

// --- Сессионный токен приложения -------------------------------------------
// Пароли не хранятся и не принимаются: у приложения есть только подписанный
// сессионный токен, выданный после успешного входа через SberBusiness ID.

function sign(payloadB64) {
  return crypto
    .createHmac('sha256', config.sessionSecret)
    .update(payloadB64)
    .digest('base64url');
}

export function createSessionToken(userId) {
  const payload = {
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + config.sessionTtlSec,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function readSessionToken(token) {
  if (!token || !token.includes('.')) return null;
  const [payloadB64, signature] = token.split('.');
  const expected = sign(payloadB64);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
