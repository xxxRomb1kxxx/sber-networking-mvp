// Озвучка сцен из script.json.
//
//   node voice.mjs          синтезирует все сцены
//   node voice.mjs --keep   оставляет уже лежащие public/voice/<scene>.wav (например, запись диктора)
//
// Движок задаётся в script.json → voice:
//   engine "edge" — нейросетевой голос Microsoft через edge-tts (нужны интернет и `uv`;
//                   текст озвучки уходит в облачный сервис Microsoft);
//   engine "say"  — системный голос macOS, работает офлайн.
//
// Произношение правится словарём script.json → pronounce: слово → как его читать.
// Апостроф после гласной ставит ударение («тому'»). Словарь применяется только к синтезу,
// в субтитрах и VOICEOVER.md остаётся исходный текст.
//
// Длительности пишутся в public/voice/durations.json — по ним record.mjs растягивает
// сцены, чтобы действие на экране не заканчивалось раньше фразы.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const script = JSON.parse(fs.readFileSync(path.join(__dirname, 'script.json'), 'utf8'));
const keep = process.argv.includes('--keep');
const VOICE_DIR = path.join(__dirname, 'public', 'voice');
fs.mkdirSync(VOICE_DIR, { recursive: true });

const probe = (file) =>
  Number(
    execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file])
      .toString()
      .trim()
  );

const STRESS = '\u0301';
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rules = Object.entries(script.pronounce ?? {}).map(([word, say]) => [
  new RegExp(`(?<!\\p{L})${escapeRe(word)}(?!\\p{L})`, 'gu'),
  say.replaceAll("'", STRESS),
]);
const forSpeech = (text) => rules.reduce((t, [re, say]) => t.replace(re, say), text);

function synthesize(text, raw) {
  const v = script.voice;
  if (v.engine === 'edge') {
    // Облачный сервис иногда отвечает пустым потоком — повторяем.
    for (let attempt = 1; ; attempt++) {
      try {
        execFileSync('uvx', [
          'edge-tts', '--voice', v.name, `--rate=${v.rate}`, `--pitch=${v.pitch}`,
          '--text', text, '--write-media', raw,
        ], { stdio: ['ignore', 'ignore', 'pipe'] });
        if (fs.statSync(raw).size > 0) return;
      } catch (e) {
        if (attempt >= 5) throw new Error(`edge-tts: ${e.stderr?.toString().trim().split('\n').at(-1)}`);
      }
      execFileSync('sleep', [String(attempt * 2)]);
    }
  } else {
    execFileSync('say', ['-v', v.name, '-r', String(v.rate), '-o', raw, text]);
  }
}

const durations = {};
for (const scene of script.scenes) {
  const wav = path.join(VOICE_DIR, `${scene.id}.wav`);
  if (!(keep && fs.existsSync(wav))) {
    const raw = path.join(VOICE_DIR, `${scene.id}.${script.voice.engine === 'edge' ? 'mp3' : 'aiff'}`);
    synthesize(forSpeech(scene.narration), raw);
    // Срезаем тишину по краям — паузы задаёт монтаж, а не файл.
    execFileSync('ffmpeg', [
      '-y', '-loglevel', 'error', '-i', raw,
      '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,loudnorm=I=-16:TP=-1.5:LRA=11',
      '-ar', '48000', '-ac', '2', wav,
    ]);
    fs.rmSync(raw);
  }
  durations[scene.id] = probe(wav);
  console.log(`${scene.id.padEnd(9)} ${durations[scene.id].toFixed(1)} c`);
}
fs.writeFileSync(path.join(VOICE_DIR, 'durations.json'), JSON.stringify(durations, null, 2));
