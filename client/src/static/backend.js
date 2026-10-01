/**
 * Сервер внутри браузера — для статической публикации (GitHub Pages).
 *
 * Тот же код из server/src: роуты, подбор, имитация СберБизнес ID и GigaChat.
 * Node-модули подменены в vite.config.js (папка static/node), демо-база хранится
 * в localStorage. Запросы `fetch('/api/...')` и Socket.IO обслуживаются здесь же.
 */
import './node/globals.js';
import { Router, dispatch } from './node/express.js';
import { db } from '../../../server/src/db.js';
import { initWs } from '../../../server/src/ws.js';
import { authRouter } from '../../../server/src/routes/auth.js';
import { profileRouter } from '../../../server/src/routes/profile.js';
import { feedRouter } from '../../../server/src/routes/feed.js';
import { matchesRouter } from '../../../server/src/routes/matches.js';
import { eventsRouter } from '../../../server/src/routes/events.js';
import { mockRouter } from '../../../server/src/routes/mock.js';

const app = Router();
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/feed', feedRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/mock', mockRouter);
app.use('/mock', mockRouter);
initWs(null);

// Сервер откладывает запись базы на 120 мс; при уходе со страницы пишем сразу,
// иначе, например, код авторизации пропадёт до перехода на /auth/callback.
const flush = () => {
  void db.data;
  db.saveNow();
};
addEventListener('pagehide', flush);

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

const realFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  if (!url.startsWith('/api/')) return realFetch(input, init);
  const res = await dispatch(app, {
    method: init.method,
    url,
    headers: init.headers,
    body: init.body ? JSON.parse(init.body) : undefined,
  });
  return new Response(res.body, { status: res.status, headers: { 'Content-Type': res.type } });
};

/**
 * Страницы имитации СберБизнес ID (/mock/...) — у настоящего сервера это
 * отдельный HTML. Здесь GitHub Pages открывает приложение через 404.html,
 * а страницу рисуем сами.
 */
async function renderMockPage() {
  const path = location.pathname.slice(base.length);
  if (!path.startsWith('/mock/')) return false;
  const res = await dispatch(app, { url: path + location.search });
  if (res.location) {
    flush();
    location.replace(res.location.startsWith('/') ? base + res.location : res.location);
  } else {
    const html = res.body.replaceAll('href="/mock/', `href="${base}/mock/`);
    document.open();
    document.write(html);
    document.close();
  }
  return true;
}

export const takeover = await renderMockPage();
