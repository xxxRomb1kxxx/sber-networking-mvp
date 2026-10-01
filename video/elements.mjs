// Элементы ролика в PNG для монтажа в любом редакторе: node elements.mjs → out/elements/
// Цвета, шрифты и размеры те же, что в src/Video.jsx. Элементы — с прозрачным фоном
// и в двойном разрешении (@2x), фоны — ровно в размер кадра.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const out = path.join(here, 'out', 'elements');
const script = JSON.parse(readFileSync(path.join(here, 'script.json'), 'utf8'));

const C = {
  ink: '#0e1a14',
  inkSoft: '#384740',
  brand: '#17a94b',
  brandDeep: '#0a6e38',
  brandLift: '#43d17e',
  canvas: '#f1f3f0',
  sub: '#cfe0d6',
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const head = `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600&family=Unbounded:wght@500;600&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0}
html,body{background:transparent;font-family:'Onest',sans-serif;-webkit-font-smoothing:antialiased}
#el{display:inline-block}
.logo{display:inline-flex;align-items:flex-end;font-family:'Unbounded',sans-serif;font-weight:600;letter-spacing:-.045em;line-height:1}
.logo i{width:.34em;height:.34em;border-radius:50%;background:${C.brand};margin-left:.12em;margin-bottom:.1em}
.step{font-family:'Unbounded',sans-serif;font-weight:600;color:${C.brand}}
h1{font-family:'Unbounded',sans-serif;font-weight:600;line-height:1.1;letter-spacing:-.03em;color:${C.ink}}
.bullet{display:flex;align-items:center;gap:22px;font-size:36px;color:${C.inkSoft};line-height:1.3;margin-bottom:22px}
.bullet:last-child{margin-bottom:0}
.bullet i,.dot{width:14px;height:14px;border-radius:50%;background:${C.brand};flex:none}
.pill{padding:18px 38px;border-radius:999px;color:#fff;font-family:'Unbounded',sans-serif;font-weight:500;font-size:34px;
  background:linear-gradient(145deg,${C.brandLift},${C.brand} 42%,${C.brandDeep})}
</style></head><body>`;

const logo = (size, color) => `<span class="logo" style="font-size:${size}px;color:${color}">Сберконнект<i></i></span>`;

// Рамка телефона с прозрачным экраном: исходник записи 390×844, высота экрана 900 (или 1180 в вертикали).
function phone(height, shadow) {
  const width = height / (844 / 390);
  const bezel = height * 0.018;
  const W = width + bezel * 2;
  const H = height + bezel * 2;
  const pad = shadow ? 120 : 0;
  const r = (x, y, w, h, rx) =>
    `M${x + rx},${y}H${x + w - rx}A${rx},${rx} 0 0 1 ${x + w},${y + rx}V${y + h - rx}A${rx},${rx} 0 0 1 ${x + w - rx},${y + h}` +
    `H${x + rx}A${rx},${rx} 0 0 1 ${x},${y + h - rx}V${y + rx}A${rx},${rx} 0 0 1 ${x + rx},${y}Z`;
  const outer = r(pad, pad, W, H, height * 0.07);
  const screen = r(pad + bezel, pad + bezel, width, height, height * 0.058);
  const size = `width="${W + pad * 2}" height="${H + pad * 2}"`;
  if (!shadow) return `<svg ${size}><path d="${outer + screen}" fill="#111" fill-rule="evenodd"/></svg>`;
  // Тень считается от целого корпуса, а экран вырезается маской — так тень не заходит под запись.
  return `<svg ${size}><defs><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" ${size}>
    <rect ${size} fill="#fff"/><path d="${screen}" fill="#000"/></mask></defs>
    <g mask="url(#m)"><path d="${outer}" fill="#111"
      style="filter:drop-shadow(0 40px 45px rgba(14,26,20,.4)) drop-shadow(0 8px 12px rgba(14,26,20,.18))"/></g></svg>`;
}

function titleBg(w, h) {
  return `<div style="position:relative;width:${w}px;height:${h}px;background:${C.ink};overflow:hidden">
    <div style="position:absolute;width:1400px;height:1400px;border-radius:50%;left:50%;top:50%;
      transform:translate(-50%,-50%) translateY(230px);
      background:radial-gradient(circle,${C.brand}55 0%,${C.brandDeep}22 40%,transparent 70%)"></div></div>`;
}

function demoBg(w, h) {
  return `<div style="position:relative;width:${w}px;height:${h}px;background:${C.canvas};overflow:hidden">
    <div style="position:absolute;width:1100px;height:1100px;right:-300px;top:-350px;border-radius:50%;
      background:radial-gradient(circle,${C.brandLift}33 0%,transparent 65%)"></div>
    <div style="position:absolute;width:900px;height:900px;left:-300px;bottom:-400px;border-radius:50%;
      background:radial-gradient(circle,${C.brand}22 0%,transparent 65%)"></div></div>`;
}

// Финальный кадр заставки/финала целиком (для превью, обложки, стоп-кадра).
function titleCard(scene, w, h) {
  const vertical = h > w;
  return `<div style="position:relative;width:${w}px;height:${h}px">
    ${titleBg(w, h)}
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
      ${logo(vertical ? 110 : 150, '#fff')}
      <p style="color:${C.sub};font-size:${vertical ? 44 : 46}px;max-width:${vertical ? 860 : 1300}px;line-height:1.3;margin-top:40px">${esc(scene.subtitle)}</p>
      ${scene.footer ? `<div class="pill" style="margin-top:56px">${esc(scene.footer)}</div>` : ''}
    </div></div>`;
}

function caption(scene, { bullets, vertical }) {
  return `<div style="width:${vertical ? 920 : 760}px">
    <div class="step" style="font-size:${vertical ? 40 : 44}px">${scene.step}</div>
    <h1 style="font-size:${vertical ? 64 : 72}px;margin-top:14px">${esc(scene.title)}</h1>
    ${bullets ? `<div style="margin-top:36px">${scene.bullets.map((b) => `<div class="bullet"><i></i>${esc(b)}</div>`).join('')}</div>` : ''}
  </div>`;
}

function progress(count, active) {
  return `<div style="display:flex;gap:10px">${Array.from({ length: count }, (_, i) =>
    `<span style="width:${i === active ? 48 : 12}px;height:12px;border-radius:6px;background:${i <= active ? C.brand : '#cdd6d0'}"></span>`
  ).join('')}</div>`;
}

const screens = script.scenes.filter((s) => s.kind === 'screen');
const [intro, outro] = [script.scenes[0], script.scenes.at(-1)];

// [имя файла, html, масштаб]; масштаб 1 — для полноразмерных кадров.
const items = [
  ['logo/logo-dark.png', logo(150, C.ink), 2],
  ['logo/logo-white.png', logo(150, '#fff'), 2],
  ['logo/logo-green.png', logo(150, C.brand), 2],
  ['logo/dot.png', `<span class="dot" style="display:block;width:120px;height:120px"></span>`, 2],
  ['logo/logo-on-dark.png', `<div style="padding:60px 80px;background:${C.ink};border-radius:40px">${logo(150, '#fff')}</div>`, 2],

  ['backgrounds/title-bg-1920x1080.png', titleBg(1920, 1080), 1],
  ['backgrounds/title-bg-1080x1920.png', titleBg(1080, 1920), 1],
  ['backgrounds/demo-bg-1920x1080.png', demoBg(1920, 1080), 1],
  ['backgrounds/demo-bg-1080x1920.png', demoBg(1080, 1920), 1],

  ['frames/intro-1920x1080.png', titleCard(intro, 1920, 1080), 1],
  ['frames/outro-1920x1080.png', titleCard(outro, 1920, 1080), 1],
  ['frames/intro-1080x1920.png', titleCard(intro, 1080, 1920), 1],
  ['frames/outro-1080x1920.png', titleCard(outro, 1080, 1920), 1],

  ['phone/phone-frame.png', phone(900, false), 2],
  ['phone/phone-frame-shadow.png', phone(900, true), 2],
  ['phone/phone-frame-vertical.png', phone(1180, false), 2],

  ['text/intro-subtitle.png', `<p style="color:${C.sub};font-size:46px;max-width:1300px;line-height:1.3;text-align:center">${esc(intro.subtitle)}</p>`, 2],
  ['text/outro-subtitle.png', `<p style="color:${C.sub};font-size:46px;max-width:1300px;line-height:1.3;text-align:center">${esc(outro.subtitle)}</p>`, 2],
  ['text/footer-pill.png', `<div class="pill">${esc(outro.footer)}</div>`, 2],
  ['text/bullet-dot.png', `<span class="dot" style="display:block"></span>`, 2],

  ...screens.flatMap((s, i) => [
    [`captions/${s.step}-${s.id}.png`, caption(s, { bullets: true }), 2],
    [`captions/${s.step}-${s.id}-title.png`, caption(s, { bullets: false }), 2],
    [`captions/${s.step}-${s.id}-vertical.png`, caption(s, { bullets: false, vertical: true }), 2],
    [`progress/progress-${s.step}.png`, progress(screens.length, i), 2],
  ]),
];

rmSync(out, { recursive: true, force: true });
const browser = await chromium.launch();
const pages = {};
for (const scale of [1, 2]) {
  pages[scale] = await browser.newPage({ viewport: { width: 2400, height: 2400 }, deviceScaleFactor: scale });
}
for (const [name, html, scale] of items) {
  const page = pages[scale];
  await page.setContent(`${head}<div id="el">${html}</div></body></html>`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const file = path.join(out, name);
  mkdirSync(path.dirname(file), { recursive: true });
  await page.locator('#el > *').first().screenshot({ path: file, omitBackground: true });
  console.log(name);
}
await browser.close();
