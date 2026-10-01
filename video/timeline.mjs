// Раскладка ролика по времени: заставка → непрерывная запись с подписями сцен → финал.
//
//   node timeline.mjs   → src/manifest.json, out/subtitles.srt, VOICEOVER.md
//
// Берёт длительности озвучки (voice.mjs) и метки сцен из записи (record.mjs).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => JSON.parse(fs.readFileSync(path.join(__dirname, p), 'utf8'));

const script = read('script.json');
const voice = read('public/voice/durations.json');
const markers = read('public/clips/markers.json');
const { fps, leadIn, titleTail, overlap } = script.timing;

const f = (sec) => Math.round(sec * fps);
const OVERLAP = f(overlap);
const [introScene, outroScene] = [script.scenes[0], script.scenes.at(-1)];

// Заставка уходит в запись наплывом: последние OVERLAP кадров идут поверх начала записи.
const intro = { from: 0, frames: f(leadIn + voice.intro + titleTail) + OVERLAP };
const demo = { from: intro.frames - OVERLAP, frames: f(markers.at(-1).at) };
const scenes = markers.slice(0, -1).map((m, i) => ({
  id: m.id,
  from: demo.from + f(m.at),
  frames: f(markers[i + 1].at) - f(m.at),
}));
const outro = { from: demo.from + demo.frames - OVERLAP };
outro.frames = OVERLAP + f(leadIn + voice.outro + titleTail);

const audio = [
  { id: introScene.id, from: f(leadIn) },
  ...scenes.map((s) => ({ id: s.id, from: s.from + f(leadIn) })),
  { id: outroScene.id, from: outro.from + OVERLAP + f(leadIn) },
].map((a) => ({ ...a, frames: f(voice[a.id]) }));
const totalFrames = outro.from + outro.frames;

fs.writeFileSync(
  path.join(__dirname, 'src', 'manifest.json'),
  JSON.stringify({ fps, overlap: OVERLAP, totalFrames, intro, demo, outro, scenes, audio }, null, 2)
);

// --- Субтитры и текст диктора ---------------------------------------------------

const ts = (sec) => {
  const ms = Math.round(sec * 1000);
  const hh = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const mm = String(Math.floor(ms / 60000) % 60).padStart(2, '0');
  const ss = String(Math.floor(ms / 1000) % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss},${String(ms % 1000).padStart(3, '0')}`;
};
const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

const spans = {
  [introScene.id]: [0, intro.frames - OVERLAP],
  ...Object.fromEntries(scenes.map((s) => [s.id, [s.from, s.from + s.frames]])),
  [outroScene.id]: [outro.from, totalFrames],
};

// Фраза по предложениям, время делим пропорционально длине — для субтитров этого достаточно.
const srt = [];
const md = ['# Текст диктора «Сберконнект»', '', `Общая длительность: ${mmss(totalFrames / fps)}.`, ''];
for (const scene of script.scenes) {
  const start = audio.find((a) => a.id === scene.id).from / fps;
  const sentences = scene.narration.match(/[^.!?]+[.!?]+/g) ?? [scene.narration];
  const total = sentences.reduce((n, s) => n + s.length, 0);
  let at = start;
  for (const s of sentences) {
    const dur = (s.length / total) * voice[scene.id];
    srt.push(`${srt.length + 1}\n${ts(at)} --> ${ts(at + dur)}\n${s.trim()}\n`);
    at += dur;
  }
  const [a, b] = spans[scene.id];
  const heading =
    scene === introScene ? 'Вступление' : scene === outroScene ? 'Финал' : `${scene.step}. ${scene.title}`;
  md.push(`## ${mmss(a / fps)}–${mmss(b / fps)} · ${heading}`, '', scene.narration, '');
}

fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'out', 'subtitles.srt'), srt.join('\n'));
fs.writeFileSync(path.join(__dirname, 'VOICEOVER.md'), md.join('\n'));
console.log(`ролик ${mmss(totalFrames / fps)} (${totalFrames} кадров)`);
