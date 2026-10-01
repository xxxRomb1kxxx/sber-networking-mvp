import { useRef, useState } from 'react';
import { useCountUp } from '../hooks/useCountUp.js';
import Meter from './Meter.jsx';
import { IconHeart, IconClose } from './Icons.jsx';

export default function CandidateCard({ item, goals, onDecide, busy }) {
  const { profile, score, reason, tags } = item;
  const displayScore = useCountUp(score);
  const [dx, setDx] = useState(0);
  const startX = useRef(null);

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
  };
  const onTouchMove = (e) => {
    if (startX.current === null) return;
    setDx(e.touches[0].clientX - startX.current);
  };
  const onTouchEnd = () => {
    if (Math.abs(dx) > 90 && !busy) onDecide(dx > 0 ? 'like' : 'skip');
    startX.current = null;
    setDx(0);
  };

  const goalNames = (profile.goals || []).map((g) => goals[g]).filter(Boolean);
  const initials = (profile.fullName || '?')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('');

  return (
    <article
      className="candidate"
      style={{ transform: dx ? `translateX(${dx}px) rotate(${dx / 40}deg)` : undefined }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <header className="candidate-head">
        <div className="candidate-portrait">
          {profile.photo ? (
            <img src={profile.photo} alt={profile.fullName} />
          ) : (
            <div
              className="candidate-photo-fallback"
              style={{ background: profile.avatarColor || '#0A6E38' }}
            >
              {initials}
            </div>
          )}
        </div>

        <div className="candidate-ident">
          <div className="candidate-name">{profile.fullName}</div>
          <div className="candidate-role">
            {[profile.position, profile.company].filter(Boolean).join(', ') || 'Данные скрыты'}
          </div>
          {profile.region && <div className="candidate-region">{profile.region}</div>}
        </div>

        <Meter
          percent={score}
          label={`${displayScore}%`}
          tone={score >= 50 ? 'brand' : 'amber'}
          size="md"
        />
      </header>

      <div className="candidate-body">
        <div className="reason">
          <div className="reason-head">Почему подходит на {displayScore}%</div>
          {reason}
        </div>

        <dl className="candidate-facts">
          <dt>Отрасль</dt>
          <dd>{profile.industry || '—'}</dd>
          <dt>Регион</dt>
          <dd>{profile.region || 'Скрыт'}</dd>
          <dt>Сотрудников</dt>
          <dd>{profile.companySize || '—'}</dd>
          <dt>Ищет</dt>
          <dd>{goalNames.join(', ') || '—'}</dd>
        </dl>

        {profile.request && <p className="candidate-quote">{profile.request}</p>}
        {profile.about && <p className="muted" style={{ fontSize: 14 }}>{profile.about}</p>}

        {tags?.length > 0 && (
          <div className="chips">
            {tags.map((t) => (
              <span key={t} className="tag">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <footer className="candidate-actions">
        <button className="btn btn-ghost" disabled={busy} onClick={() => onDecide('skip')}>
          <IconClose width={17} height={17} />
          Пропустить
        </button>
        <button className="btn" disabled={busy} onClick={() => onDecide('like')}>
          <IconHeart width={17} height={17} />
          Интересно
        </button>
      </footer>
    </article>
  );
}
