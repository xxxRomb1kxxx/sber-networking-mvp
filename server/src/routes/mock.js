import { Router } from 'express';
import { demoAccounts, issueCode } from '../sberid.js';
import { config } from '../config.js';
import { db } from '../db.js';
import { SYSTEM_PROMPT } from '../gigachat.js';

export const mockRouter = Router();

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Экран согласия «СберБизнес ID» — имитация страницы провайдера. */
mockRouter.get('/sberid/authorize', (req, res) => {
  const { state = '', redirect_uri: redirectUri = '' } = req.query;
  const accounts = demoAccounts();

  const cards = accounts
    .map(
      (a) => `
      <a class="acc" href="/mock/sberid/approve?sberId=${encodeURIComponent(a.sberId)}&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}">
        ${
          a.photo
            ? `<img class="ava" src="${esc(a.photo)}" alt="" />`
            : `<span class="ava" style="background:${esc(a.avatarColor)}">${esc(a.fullName.slice(0, 1))}</span>`
        }
        <span class="acc-body">
          <span class="acc-name">${esc(a.fullName)}</span>
          <span class="acc-meta">${esc(a.position)} · ${esc(a.company)}</span>
          <span class="acc-inn">ИНН ${esc(a.inn)}</span>
        </span>
      </a>`
    )
    .join('');

  res.type('html').send(`<!doctype html>
<html lang="ru"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>СберБизнес ID — вход</title>
<style>
  :root { --green:#21A038; --ink:#1A1A1A; --muted:#6E7681; --line:#E4E7EC; }
  * { box-sizing:border-box }
  body { margin:0; font-family:'SB Sans Text',-apple-system,'Segoe UI',Roboto,Arial,sans-serif;
         background:#F5F5F5; color:var(--ink); display:flex; justify-content:center; padding:24px 16px 48px }
  .sheet { width:100%; max-width:440px }
  .brand { display:flex; align-items:center; gap:10px; margin-bottom:28px }
  .dot { width:26px; height:26px; border-radius:50%; background:var(--green) }
  .brand b { font-weight:600; font-size:17px; letter-spacing:-.01em }
  h1 { font-size:24px; line-height:1.25; margin:0 0 8px; letter-spacing:-.02em }
  p.lead { margin:0 0 24px; color:var(--muted); font-size:15px; line-height:1.5 }
  .demo { border-left:3px solid var(--green); background:#fff; padding:12px 14px; font-size:13px;
          color:var(--muted); line-height:1.5; margin-bottom:20px }
  .acc { display:flex; gap:12px; align-items:center; background:#fff; padding:14px; margin-bottom:8px;
         text-decoration:none; color:inherit; border:1px solid var(--line); border-radius:12px }
  .acc:hover, .acc:focus-visible { border-color:var(--green); outline:none }
  .ava { width:40px; height:40px; border-radius:50%; color:#fff; display:grid; place-items:center;
         font-weight:600; flex:none; object-fit:cover; background:#e4e7ec }
  .acc-body { display:flex; flex-direction:column; gap:2px; min-width:0 }
  .acc-name { font-weight:600; font-size:15px }
  .acc-meta { font-size:13px; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
  .acc-inn { font-size:12px; color:#9AA3AD }
  .deny { display:block; text-align:center; margin-top:20px; color:var(--muted); font-size:14px }
  .scopes { margin:24px 0 0; padding:16px; background:#fff; border-radius:12px; border:1px solid var(--line) }
  .scopes h2 { font-size:14px; margin:0 0 8px; font-weight:600 }
  .scopes ul { margin:0; padding-left:18px; color:var(--muted); font-size:13px; line-height:1.7 }
</style></head>
<body><div class="sheet">
  <div class="brand"><span class="dot"></span><b>СберБизнес ID</b></div>
  <h1>Вход в «Сберконнект»</h1>
  <p class="lead">Сервис запросит данные вашей компании, чтобы подтвердить, что вы клиент СберБизнеса.</p>
  <div class="demo">Это имитация провайдера для демо. Реальный СберБизнес ID не вызывается, пароль не запрашивается. Выберите любую тестовую компанию.</div>
  ${cards}
  <div class="scopes">
    <h2>Приложение получит</h2>
    <ul><li>ФИО и должность</li><li>Название компании и ИНН</li><li>Статус клиента СберБизнеса</li></ul>
  </div>
  <a class="deny" href="/mock/sberid/deny?state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}">Отменить вход</a>
</div></body></html>`);
});

mockRouter.get('/sberid/approve', (req, res) => {
  const { sberId, state = '', redirect_uri: redirectUri } = req.query;
  if (!redirectUri) return res.status(400).send('redirect_uri не передан');
  const code = issueCode(String(sberId));
  const url = new URL(String(redirectUri));
  url.searchParams.set('code', code);
  url.searchParams.set('state', String(state));
  res.redirect(url.toString());
});

mockRouter.get('/sberid/deny', (req, res) => {
  const { state = '', redirect_uri: redirectUri } = req.query;
  if (!redirectUri) return res.status(400).send('redirect_uri не передан');
  const url = new URL(String(redirectUri));
  url.searchParams.set('error', 'access_denied');
  url.searchParams.set('state', String(state));
  res.redirect(url.toString());
});

// --- Управление имитацией и метрики -----------------------------------------

mockRouter.get('/settings', (req, res) => {
  res.json({ mock: config.mock, systemPrompt: SYSTEM_PROMPT });
});

mockRouter.put('/settings', (req, res) => {
  const b = req.body || {};
  for (const key of ['gigachatLatencyMs', 'gigachatFailureRate', 'autoLikeBackRate', 'autoReplyDelayMs']) {
    if (typeof b[key] === 'number') config.mock[key] = b[key];
  }
  res.json({ mock: config.mock });
});

mockRouter.post('/reset', (req, res) => {
  db.reset();
  res.json({ ok: true, message: 'Демо-база возвращена к исходному состоянию' });
});

/** Метрики успеха MVP (п. 13 ТЗ) — считаются по демо-базе. */
mockRouter.get('/metrics', (req, res) => {
  const { users, likes, matches, messages, events, eventRegistrations } = db.data;
  const real = users.filter((u) => !u.isSeed);
  const likeCount = likes.filter((l) => l.value === 'like').length;
  // Записи, сделанные в приложении: у предзаполненных id начинается с «reg-».
  const liveSignups = eventRegistrations.filter((r) => !r.id.startsWith('reg-')).length;
  const upcoming = events.filter((e) => new Date(e.endsAt) >= new Date());
  const seats = upcoming.reduce((n, e) => n + e.seats, 0);
  const taken = eventRegistrations.filter((r) =>
    upcoming.some((e) => e.id === r.eventId)
  ).length;

  const firstReply = matches
    .map((m) => {
      const first = messages
        .filter((x) => x.matchId === m.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
      return first ? new Date(first.createdAt) - new Date(m.createdAt) : null;
    })
    .filter(Boolean);

  res.json({
    registeredUsers: real.length,
    profilesCompletedPct: real.length
      ? Math.round((real.filter((u) => u.profileComplete).length / real.length) * 100)
      : 0,
    matchRatePct: likeCount ? Math.round(((matches.length * 2) / likeCount) * 100) : 0,
    matches: matches.length,
    messages: messages.length,
    avgMinutesToFirstMessage: firstReply.length
      ? Math.round(firstReply.reduce((a, b) => a + b, 0) / firstReply.length / 60000)
      : null,
    upcomingEvents: upcoming.length,
    seatsFilledPct: seats ? Math.round((taken / seats) * 100) : 0,
    eventSignups: liveSignups,
  });
});
