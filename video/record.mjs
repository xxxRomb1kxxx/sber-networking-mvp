// Записывает демо-прогон Сберконнекта одним непрерывным дублем в мобильном окне.
// Перед запуском: `npm run dev` в корне репозитория и `node voice.mjs` здесь.
//
//   node record.mjs   → public/clips/demo.mp4 + public/clips/markers.json
//
// Каждая сцена длится не меньше своей озвучки (public/voice/durations.json):
// если действия закончились раньше фразы, экран спокойно стоит до конца фразы,
// а не замирает стоп-кадром при монтаже.
//
// Сценарий повторяемый: база сбрасывается, ответный лайк включается на 100%,
// после прогона настройки имитации возвращаются к значениям по умолчанию.

import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP = process.env.APP_URL || 'http://localhost:5173';
const API = `${APP}/api`;
const OUT = path.join(__dirname, 'public', 'clips');
const TMP = path.join(__dirname, '.rec');

const script = JSON.parse(fs.readFileSync(path.join(__dirname, 'script.json'), 'utf8'));
const { fps: FPS, leadIn, tail } = script.timing;
const durationsFile = path.join(__dirname, 'public', 'voice', 'durations.json');

const VIEWPORT = { width: 390, height: 844 };
const SCALE = 2;

const DEFAULT_MOCK = {
  gigachatLatencyMs: 900,
  gigachatFailureRate: 0,
  autoLikeBackRate: 0.45,
  autoReplyDelayMs: 4000,
};

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function http(pathname, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${pathname}: ${res.status} ${await res.text()}`);
  return res.json();
}

/** Вход под тестовой компанией без браузера — для «второго участника». */
async function loginAs(sberId) {
  const redirectUri = `${APP}/auth/callback`;
  const { state } = await http('/auth/sberid/start', { method: 'POST', body: { redirectUri } });
  const approve = new URL(`${APP}/mock/sberid/approve`);
  approve.search = new URLSearchParams({ sberId, state, redirect_uri: redirectUri }).toString();
  const res = await fetch(approve, { redirect: 'manual' });
  const code = new URL(res.headers.get('location')).searchParams.get('code');
  const { sessionToken } = await http('/auth/sberid/callback', { method: 'POST', body: { code } });
  return sessionToken;
}

// Круги касаний: в записи нет курсора, без них непонятно, куда нажали.
// Размытие под окном мэтча при масштабе 2 рендерится медленнее кадра и даёт рывки —
// на время записи заменяем его затемнением того же тона. Служебные пометки демо-стенда
// («интеграции имитируются») в промо-ролике не показываем.
const PAGE_SCRIPT = `
  addEventListener('pointerdown', (e) => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;width:44px;height:44px;' +
      'margin:-22px 0 0 -22px;border-radius:50%;background:rgba(23,169,75,.35);' +
      'border:2px solid rgba(23,169,75,.8);transition:transform .45s ease-out,opacity .45s ease-out;' +
      'left:' + e.clientX + 'px;top:' + e.clientY + 'px;transform:scale(.4);opacity:1';
    document.documentElement.appendChild(d);
    requestAnimationFrame(() => { d.style.transform = 'scale(1.3)'; d.style.opacity = '0'; });
    setTimeout(() => d.remove(), 500);
  }, true);
  addEventListener('DOMContentLoaded', () => {
    const s = document.createElement('style');
    s.textContent = '.modal-backdrop{backdrop-filter:none!important;background:rgba(14,26,20,.55)!important}' +
      '.login-note,.demo{display:none!important}';
    document.head.appendChild(s);
  });
`;

// Встроенная запись Playwright и CDP-скринкаст отдают кадр в CSS-пикселях (390×844),
// поэтому снимаем поток скриншотов с масштабом 2 и склеиваем их по реальным меткам времени.
async function startRecorder(context, page) {
  const cdp = await context.newCDPSession(page);
  const frames = [];
  let running = true;
  const t0 = Date.now();

  const loop = (async () => {
    while (running) {
      const started = Date.now();
      try {
        // clip задаётся в координатах документа — сдвигаем его на текущую прокрутку.
        const { cssVisualViewport: vv } = await cdp.send('Page.getLayoutMetrics');
        const clip = { x: vv.pageX, y: vv.pageY, ...VIEWPORT, scale: SCALE };
        const { data } = await cdp.send('Page.captureScreenshot', {
          format: 'jpeg',
          quality: 92,
          optimizeForSpeed: true,
          clip,
        });
        const file = path.join(TMP, `f${String(frames.length).padStart(6, '0')}.jpg`);
        fs.writeFileSync(file, Buffer.from(data, 'base64'));
        frames.push({ file, at: started });
      } catch {
        // Кадр во время навигации может не сняться — пропускаем.
      }
      await pause(Math.max(0, 1000 / FPS - (Date.now() - started)));
    }
  })();

  return {
    t0,
    async stop() {
      running = false;
      await loop;
    },
    /** Статистика ровности захвата на отрезке [from, to] секунд от t0. */
    stats(from, to) {
      const inRange = frames.filter((f) => {
        const s = (f.at - t0) / 1000;
        return s >= from && s <= to;
      });
      const gaps = inRange.slice(1).map((f, i) => ({ g: f.at - inRange[i].at, at: (inRange[i].at - t0) / 1000 - from }));
      const slow = gaps.filter(({ g }) => g > 1000 / FPS + 20);
      const avg = gaps.reduce((a, { g }) => a + g, 0) / gaps.length;
      console.log(
        `захват: ${(1000 / avg).toFixed(1)} fps, интервалов длиннее ${Math.round(1000 / FPS + 20)} мс: ${slow.length}`
      );
      if (process.env.DEBUG_GAPS) slow.forEach(({ g, at }) => console.log(`  ${at.toFixed(2)} c: ${g} мс`));
    },
    encode(out, from, to) {
      // Кадр держится до следующего — так скорость в видео равна реальной.
      const list = frames.map((f, i) => {
        const next = frames[i + 1]?.at ?? f.at + 1000 / FPS;
        return `file '${f.file}'\nduration ${((next - f.at) / 1000).toFixed(4)}`;
      });
      list.push(`file '${frames.at(-1).file}'`);
      const listFile = path.join(TMP, 'frames.txt');
      fs.writeFileSync(listFile, list.join('\n'));
      const offset = (frames[0].at - t0) / 1000;
      execFileSync('ffmpeg', [
        '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile,
        '-ss', (from - offset).toFixed(3), '-to', (to - offset).toFixed(3),
        '-vf', `fps=${FPS}`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '14', out,
      ]);
    },
  };
}

async function main() {
  if (!fs.existsSync(durationsFile)) throw new Error('Нет озвучки. Сначала запустите `node voice.mjs`.');
  const voice = JSON.parse(fs.readFileSync(durationsFile, 'utf8'));

  await http('/health').catch(() => {
    throw new Error(`Приложение не отвечает на ${APP}. Запустите \`npm run dev\` в корне репозитория.`);
  });

  await http('/mock/reset', { method: 'POST' });
  // Короткие задержки имитации — чтобы в кадре не висели спиннеры, но загрузка ИИ была видна.
  await http('/mock/settings', {
    method: 'PUT',
    body: { ...DEFAULT_MOCK, gigachatLatencyMs: 1100, autoLikeBackRate: 1, autoReplyDelayMs: 1400 },
  });

  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
    hasTouch: true,
    locale: 'ru-RU',
  });
  await context.addInitScript(PAGE_SCRIPT);

  const page = await context.newPage();
  const recorder = await startRecorder(context, page);
  const now = () => (Date.now() - recorder.t0) / 1000;

  // Метка начала сцены. Предыдущая сцена добирается до длины своей фразы.
  const markers = [];
  const mark = async (id) => {
    const prev = markers.at(-1);
    if (prev) {
      const left = leadIn + voice[prev.id] + tail - (now() - prev.at);
      if (left > 0) await pause(left * 1000);
    }
    markers.push({ id, at: now() });
  };
  // Держит текущий экран, пока до конца фразы сцены не останется `rest` секунд.
  const holdUntil = async (rest) => {
    const cur = markers.at(-1);
    const left = leadIn + voice[cur.id] + tail - rest - (now() - cur.at);
    if (left > 0) await pause(left * 1000);
  };

  const cdp = await context.newCDPSession(page);
  const swipe = async (locator, dx) => {
    const box = await locator.boundingBox();
    const x = box.x + box.width / 2;
    const y = box.y + Math.min(box.height / 2, 260);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 20; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x + (dx * i) / 20, y }],
      });
      await pause(24);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  const scrollTo = async (locator, block = 'center') => {
    await locator.evaluate((el, b) => el.scrollIntoView({ behavior: 'smooth', block: b }), block);
    await pause(900);
  };
  const type = (locator, text) => locator.pressSequentially(text, { delay: 34 });
  const nav = (label) => page.locator('.nav-item', { hasText: label }).click();

  // Заставка приложения и первая отрисовка — до начала ролика.
  await page.goto(`${APP}/login`);
  await page.getByRole('button', { name: 'Войти через СберБизнес ID' }).waitFor();
  await pause(600);

  // --- 01 Вход ---------------------------------------------------------------
  await mark('login');
  await pause(2800);
  await page.getByRole('button', { name: 'Войти через СберБизнес ID' }).click();
  await page.locator('.acc').first().waitFor();
  await holdUntil(3); // экран согласия — пока диктор говорит о передаваемых данных
  await page.locator('.acc').first().click();
  await page.locator('.candidate').waitFor({ timeout: 20000 });
  await pause(1500);

  // --- 02 Подбор ---------------------------------------------------------------
  await mark('feed');
  const query = page.locator('.query-row input');
  await query.click();
  await query.fill('');
  await type(query, 'Ищу кондитерские производства в Москве для поставок замороженной ягоды');
  await pause(400);
  await page.getByRole('button', { name: 'Найти' }).click();
  await page.locator('.skeleton').waitFor();
  await page.locator('.candidate').waitFor({ timeout: 20000 });
  await pause(1800); // процент совместимости докручивается
  await scrollTo(page.locator('.candidate .reason'));
  await pause(2600);
  await scrollTo(page.locator('.candidate-facts'));
  await pause(1200);

  // --- 03 Мэтч и чат -----------------------------------------------------------
  await scrollTo(page.locator('.page-head').first(), 'start');
  await mark('match');
  await pause(300);
  await swipe(page.locator('.candidate'), -220); // пропустить
  await pause(1500);
  await swipe(page.locator('.candidate'), 220); // интересно → взаимность 100%
  await page.locator('.modal').waitFor();
  await pause(2000);
  await page.getByRole('button', { name: 'Открыть чат' }).click();
  await page.locator('.bubble').first().waitFor({ timeout: 15000 });
  await pause(1500);
  const msg = page.locator('.chat-form textarea');
  await msg.click();
  await type(msg, 'Здравствуйте! Можем обсудить пробную партию на следующей неделе?');
  await pause(300);
  await page.getByRole('button', { name: 'Отправить' }).click();
  await pause(1600);

  // --- 04 Встречи ---------------------------------------------------------------
  await mark('events');
  await nav('Встречи');
  await page.locator('.event-item').first().waitFor();
  await pause(1300);
  await page.getByRole('tab', { name: 'Календарь' }).click();
  await pause(2000);
  await page.getByRole('tab', { name: 'Ближайшие' }).click();
  await pause(700);
  // Первая встреча, куда ещё можно записаться; держим её по заголовку — кнопка после клика сменится.
  const openTitle = await page
    .locator('.event-item')
    .filter({ has: page.getByRole('button', { name: 'Занять место' }) })
    .filter({ hasNotText: 'юнит-экономика' }) // последнее место воркшопа нужно для сцены 05
    .first()
    .locator('.event-title')
    .innerText();
  const first = page.locator('.event-item', { hasText: openTitle });
  await scrollTo(first);
  await first.getByRole('button', { name: 'Занять место' }).click();
  await page.locator('.notice-inline').waitFor();
  await pause(1800);
  await first.locator('.event-title button').click();
  await page.locator('.event-hero').waitFor();
  await pause(1600);
  await page.getByRole('tab', { name: /Чат участников/ }).click();
  await pause(1000);
  const groupMsg = page.locator('.chat-form textarea');
  await groupMsg.click();
  await type(groupMsg, 'Иду с вопросом про автоматизацию склада');
  await page.getByRole('button', { name: 'Отправить' }).click();
  await pause(1500);

  // --- 05 Последнее место ------------------------------------------------------
  await mark('full');
  await page.getByRole('button', { name: 'К списку встреч' }).click();
  await page.locator('.event-item').first().waitFor();
  const workshop = page.locator('.event-item', { hasText: 'юнит-экономика' });
  await scrollTo(workshop);
  await pause(1800);
  // Другой клиент в этот момент занимает последнее место — счётчик меняется по WebSocket.
  const rival = await loginAs('SB-1004');
  await http('/events/evt-mp-unit/register', { method: 'POST', token: rival });
  await workshop.getByText('Мест не осталось').waitFor();
  await pause(2500);

  await mark('end');

  await recorder.stop();
  await context.close();
  await browser.close();
  await http('/mock/settings', { method: 'PUT', body: DEFAULT_MOCK });

  // Ролик начинается с первой сцены; метки — от начала файла.
  const start = markers[0].at;
  const end = markers.at(-1).at;
  recorder.stats(start, end);
  recorder.encode(path.join(OUT, 'demo.mp4'), start, end);
  const rebased = markers.map((m) => ({ id: m.id, at: +(m.at - start).toFixed(3) }));
  fs.writeFileSync(path.join(OUT, 'markers.json'), JSON.stringify(rebased, null, 2));
  fs.rmSync(TMP, { recursive: true, force: true });

  for (let i = 0; i < rebased.length - 1; i++) {
    const { id, at } = rebased[i];
    console.log(`${id.padEnd(9)} ${(rebased[i + 1].at - at).toFixed(1)} c · голос ${voice[id].toFixed(1)} c`);
  }
}

main().catch(async (e) => {
  console.error(e.message);
  await http('/mock/settings', { method: 'PUT', body: DEFAULT_MOCK }).catch(() => {});
  process.exit(1);
});
