// Фоновая музыка под длину ролика — синтезируется кодом, без сторонних треков и лицензий.
//
//   node music.mjs   → public/music.wav (читает длительность из src/manifest.json)
//
// Спокойный корпоративный бит: гармония C–G–Am–F, 100 BPM, пэд, арпеджио, бас,
// мягкая бочка и хэт. Первые такты — только пэд и арпеджио, ритм вступает позже.
// Чтобы поставить свой трек, положите его в public/music.wav вместо сгенерированного.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'manifest.json'), 'utf8'));

const RATE = 44100;
const BPM = 100;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const CHORD_BARS = 2;
const duration = manifest.totalFrames / manifest.fps + 1;
const N = Math.ceil(duration * RATE);

const L = new Float32Array(N);
const R = new Float32Array(N);

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
// Аккорды в MIDI: корень для баса + три тона для пэда и арпеджио.
const CHORDS = [
  { root: 36, tones: [60, 64, 67, 72] }, // C
  { root: 43, tones: [59, 62, 67, 71] }, // G
  { root: 45, tones: [57, 60, 64, 69] }, // Am
  { root: 41, tones: [57, 60, 65, 69] }, // F
];
const chordAt = (t) => CHORDS[Math.floor(t / (BAR * CHORD_BARS)) % CHORDS.length];

function add(start, len, pan, fn) {
  const s0 = Math.max(0, Math.floor(start * RATE));
  const s1 = Math.min(N, Math.floor((start + len) * RATE));
  const gl = Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = s0; i < s1; i++) {
    const v = fn((i - s0) / RATE);
    L[i] += v * gl;
    R[i] += v * gr;
  }
}

// Пэд: мягкие гармоники с медленной атакой, аккорды перетекают друг в друга.
const chordLen = BAR * CHORD_BARS;
for (let c = 0; c * chordLen < duration; c++) {
  const { tones } = CHORDS[c % CHORDS.length];
  const start = c * chordLen;
  const len = chordLen + 1.2;
  tones.slice(0, 3).forEach((m, k) => {
    const f = hz(m - 12);
    const detune = 1 + (k - 1) * 0.0015;
    add(start, len, (k - 1) * 0.5, (t) => {
      const env = Math.min(1, t / 1.0) * Math.min(1, (len - t) / 1.2);
      const ph = 2 * Math.PI * f * detune * t;
      return 0.045 * env * (Math.sin(ph) + 0.35 * Math.sin(2 * ph) + 0.12 * Math.sin(3 * ph));
    });
  });
}

// Арпеджио восьмыми с затуханием и эхом на 3/8.
const eighth = BEAT / 2;
const ARP = [0, 1, 2, 3, 2, 1, 2, 3];
for (let n = 0; n * eighth < duration; n++) {
  const t0 = n * eighth;
  const { tones } = chordAt(t0);
  const f = hz(tones[ARP[n % ARP.length]] + 12);
  const pan = n % 2 ? 0.35 : -0.35;
  const pluck = (amp) => (t) => {
    const ph = 2 * Math.PI * f * t;
    return amp * Math.exp(-t * 5.5) * (Math.sin(ph) + 0.25 * Math.sin(2 * ph)) * Math.min(1, t / 0.004);
  };
  add(t0, 1.0, pan, pluck(0.05));
  add(t0 + eighth * 3, 1.0, -pan, pluck(0.018));
}

// Ритм вступает после вступления (4 такта) и уходит за 2 такта до конца.
const rhythmFrom = BAR * 4;
const rhythmTo = duration - BAR * 2;
for (let b = 0; b * BEAT < duration; b++) {
  const t0 = b * BEAT;
  if (t0 < rhythmFrom || t0 > rhythmTo) continue;
  const inBar = b % 4;
  // Бас: корень аккорда на каждую долю.
  const fb = hz(chordAt(t0).root);
  add(t0, BEAT, 0, (t) => 0.11 * Math.exp(-t * 3) * Math.sin(2 * Math.PI * fb * t) * Math.min(1, t / 0.01));
  // Бочка на 1 и 3.
  if (inBar === 0 || inBar === 2) {
    add(t0, 0.35, 0, (t) => {
      const f = 50 + 70 * Math.exp(-t * 30);
      return 0.22 * Math.exp(-t * 9) * Math.sin(2 * Math.PI * f * t);
    });
  }
  // Хэт на слабую восьмую.
  add(t0 + BEAT / 2, 0.08, 0.2, (t) => 0.02 * Math.exp(-t * 60) * (Math.random() * 2 - 1));
}

// Общая огибающая и нормализация.
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / RATE;
  const g = Math.min(1, t / 2) * Math.min(1, (duration - t) / 3);
  L[i] *= g;
  R[i] *= g;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = 0.7 / peak;

const data = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * norm)) * 32767), i * 4);
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * norm)) * 32767), i * 4 + 2);
}
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + data.length, 4);
header.write('WAVEfmt ', 8);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(RATE, 24);
header.writeUInt32LE(RATE * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(data.length, 40);
fs.writeFileSync(path.join(__dirname, 'public', 'music.wav'), Buffer.concat([header, data]));
console.log(`музыка ${duration.toFixed(1)} c → public/music.wav`);
