import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { loadFont as loadOnest } from '@remotion/google-fonts/Onest';
import { loadFont as loadUnbounded } from '@remotion/google-fonts/Unbounded';
import manifest from './manifest.json';
import script from '../script.json';

// Те же шрифты и цвета, что в интерфейсе (client/src/styles.css).
const { fontFamily: TEXT } = loadOnest('normal', { weights: ['400', '500', '600'], subsets: ['cyrillic', 'latin'] });
const { fontFamily: DISPLAY } = loadUnbounded('normal', { weights: ['500', '600'], subsets: ['cyrillic', 'latin'] });

const C = {
  ink: '#0e1a14',
  inkSoft: '#384740',
  brand: '#17a94b',
  brandDeep: '#0a6e38',
  brandLift: '#43d17e',
  canvas: '#f1f3f0',
};

// Исходник записи — окно 390×844.
const PHONE_RATIO = 844 / 390;
const CAPTION_FADE = 10;
// Громкость музыки: под голосом приглушается, в паузах поднимается.
const MUSIC = { base: 0.32, underVoice: 0.14, ramp: 10 };

const byId = Object.fromEntries(script.scenes.map((s) => [s.id, s]));
const { intro, demo, outro, scenes, audio, overlap } = manifest;
const [introScene, outroScene] = [script.scenes[0], script.scenes.at(-1)];

export function Video() {
  return (
    <AbsoluteFill style={{ background: C.canvas, fontFamily: TEXT }}>
      <Sequence from={demo.from} durationInFrames={demo.frames} name="Запись">
        <Demo />
      </Sequence>

      <Sequence from={intro.from} durationInFrames={intro.frames} name="Заставка">
        <TitleScene scene={introScene} frames={intro.frames} fadeIn={0} fadeOut={overlap} />
      </Sequence>

      <Sequence from={outro.from} durationInFrames={outro.frames} name="Финал">
        <TitleScene scene={outroScene} frames={outro.frames} fadeIn={overlap} fadeOut={0} />
      </Sequence>

      <Audio src={staticFile('music.wav')} volume={musicVolume} />

      {audio.map((a) => (
        <Sequence key={a.id} from={a.from} name={`Голос: ${a.id}`}>
          <Audio src={staticFile(`voice/${a.id}.wav`)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

function musicVolume(frame) {
  const duck = Math.max(
    0,
    ...audio.map((a) =>
      interpolate(frame, [a.from - MUSIC.ramp, a.from, a.from + a.frames, a.from + a.frames + MUSIC.ramp], [0, 1, 1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    )
  );
  return MUSIC.base + (MUSIC.underVoice - MUSIC.base) * duck;
}

function useEnter(delay = 0) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 200 } });
}

function Logo({ size, color = C.ink }) {
  return (
    <span
      style={{
        fontFamily: DISPLAY,
        fontWeight: 600,
        fontSize: size,
        letterSpacing: '-0.045em',
        color,
        display: 'inline-flex',
        alignItems: 'flex-end',
        lineHeight: 1,
      }}
    >
      Сберконнект
      <span
        style={{
          width: size * 0.34,
          height: size * 0.34,
          borderRadius: '50%',
          background: C.brand,
          marginLeft: size * 0.12,
          marginBottom: size * 0.1,
        }}
      />
    </span>
  );
}

function TitleScene({ scene, frames, fadeIn, fadeOut }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  const logo = useEnter(fadeIn + 4);
  const sub = useEnter(fadeIn + 16);
  const foot = useEnter(fadeIn + 30);
  const opacity =
    Math.min(
      fadeIn ? interpolate(frame, [0, fadeIn], [0, 1], { extrapolateRight: 'clamp' }) : 1,
      fadeOut ? interpolate(frame, [frames - fadeOut, frames], [1, 0], { extrapolateLeft: 'clamp' }) : 1
    );
  const glow = interpolate(frame, [0, frames], [0, 60]);

  return (
    <AbsoluteFill
      style={{
        background: C.ink,
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        opacity,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 1400,
          height: 1400,
          borderRadius: '50%',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) translateY(${260 - glow}px)`,
          background: `radial-gradient(circle, ${C.brand}55 0%, ${C.brandDeep}22 40%, transparent 70%)`,
        }}
      />
      <div style={{ opacity: logo, transform: `translateY(${(1 - logo) * 40}px)` }}>
        <Logo size={vertical ? 110 : 150} color="#fff" />
      </div>
      <p
        style={{
          color: '#cfe0d6',
          fontSize: vertical ? 44 : 46,
          maxWidth: vertical ? 860 : 1300,
          lineHeight: 1.3,
          margin: '40px 0 0',
          opacity: sub,
          transform: `translateY(${(1 - sub) * 30}px)`,
        }}
      >
        {scene.subtitle}
      </p>
      {scene.footer && (
        <div
          style={{
            marginTop: 56,
            padding: '18px 38px',
            borderRadius: 999,
            background: `linear-gradient(145deg, ${C.brandLift}, ${C.brand} 42%, ${C.brandDeep})`,
            color: '#fff',
            fontFamily: DISPLAY,
            fontWeight: 500,
            fontSize: 34,
            opacity: foot,
            transform: `scale(${0.9 + foot * 0.1})`,
          }}
        >
          {scene.footer}
        </div>
      )}
    </AbsoluteFill>
  );
}

/** Вся запись одним куском: телефон стоит на месте, меняются только подписи. */
function Demo() {
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  const phoneIn = useEnter(0);
  const phoneHeight = vertical ? 1180 : 900;

  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill
        style={{
          flexDirection: vertical ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: vertical ? 50 : 140,
          padding: vertical ? '90px 80px 110px' : '0 140px 40px',
        }}
      >
        <div style={{ position: 'relative', width: vertical ? 920 : 760, height: vertical ? 260 : 520 }}>
          {scenes.map((s) => (
            <Sequence key={s.id} from={s.from - demo.from} durationInFrames={s.frames} layout="none">
              <Caption scene={byId[s.id]} frames={s.frames} vertical={vertical} />
            </Sequence>
          ))}
        </div>
        <div
          style={{
            opacity: phoneIn,
            transform: `translateY(${(1 - phoneIn) * 60}px) scale(${0.97 + phoneIn * 0.03})`,
          }}
        >
          <Phone height={phoneHeight} />
        </div>
      </AbsoluteFill>
      <Progress />
    </AbsoluteFill>
  );
}

function Phone({ height }) {
  const width = height / PHONE_RATIO;
  const bezel = height * 0.018;
  return (
    <div
      style={{
        width: width + bezel * 2,
        height: height + bezel * 2,
        padding: bezel,
        borderRadius: height * 0.07,
        background: '#111',
        boxShadow: '0 40px 90px -30px rgba(14,26,20,.55), 0 8px 24px rgba(14,26,20,.18)',
      }}
    >
      <div style={{ width, height, borderRadius: height * 0.058, overflow: 'hidden', background: '#fff' }}>
        <OffthreadVideo src={staticFile('clips/demo.mp4')} muted style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}

function Caption({ scene, frames, vertical }) {
  const frame = useCurrentFrame();
  const head = useEnter(0);
  const out = interpolate(frame, [frames - CAPTION_FADE, frames], [1, 0], { extrapolateLeft: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: vertical ? 'flex-end' : 'center',
        opacity: out,
      }}
    >
      <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: vertical ? 40 : 44, color: C.brand, opacity: head }}>
        {scene.step}
      </div>
      <h1
        style={{
          fontFamily: DISPLAY,
          fontWeight: 600,
          fontSize: vertical ? 64 : 72,
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          color: C.ink,
          margin: vertical ? '14px 0 0' : '14px 0 36px',
          opacity: head,
          transform: `translateY(${(1 - head) * 30}px)`,
        }}
      >
        {scene.title}
      </h1>
      {!vertical && scene.bullets.map((b, i) => <Bullet key={b} text={b} delay={14 + i * 8} />)}
    </div>
  );
}

function Bullet({ text, delay }) {
  const p = useEnter(delay);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 22,
        fontSize: 36,
        color: C.inkSoft,
        lineHeight: 1.3,
        marginBottom: 22,
        opacity: p,
        transform: `translateX(${(1 - p) * -30}px)`,
      }}
    >
      <span style={{ width: 14, height: 14, borderRadius: '50%', background: C.brand, flex: 'none' }} />
      {text}
    </div>
  );
}

function Backdrop() {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 90) * 40;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          width: 1100,
          height: 1100,
          right: -300 + drift,
          top: -350,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.brandLift}33 0%, transparent 65%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 900,
          height: 900,
          left: -300,
          bottom: -400 - drift,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.brand}22 0%, transparent 65%)`,
        }}
      />
    </AbsoluteFill>
  );
}

/** Полоса этапов: активный сегмент плавно растягивается при смене сцены. */
function Progress() {
  const frame = useCurrentFrame() + demo.from;
  return (
    <div
      style={{ position: 'absolute', left: 0, right: 0, bottom: 40, display: 'flex', justifyContent: 'center', gap: 10 }}
    >
      {scenes.map((s) => {
        const on = interpolate(frame, [s.from, s.from + 12, s.from + s.frames - 12, s.from + s.frames], [0, 1, 1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const passed = frame >= s.from;
        return (
          <span
            key={s.id}
            style={{
              width: 12 + on * 36,
              height: 12,
              borderRadius: 6,
              background: passed ? C.brand : '#cdd6d0',
            }}
          />
        );
      })}
    </div>
  );
}
