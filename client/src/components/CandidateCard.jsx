import { useRef, useState } from 'react';
import Avatar from './Avatar.jsx';

export default function CandidateCard({ item, goals, onDecide, busy }) {
  const { profile, score, reason, tags } = item;
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

  return (
    <article
      className="candidate"
      style={{ transform: dx ? `translateX(${dx}px) rotate(${dx / 40}deg)` : undefined }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="candidate-top">
        <Avatar user={profile} />
        <div>
          <div className="candidate-name">{profile.fullName}</div>
          <div className="candidate-role">
            {[profile.position, profile.company].filter(Boolean).join(', ') || 'Данные скрыты'}
          </div>
        </div>
      </div>

      <div className="score">
        <div className="score-row">
          <span className="score-value">{score}%</span>
          <span className="score-caption">совместимость по вашему запросу</span>
        </div>
        <div className="score-bar">
          <span style={{ width: `${score}%` }} />
        </div>
      </div>

      <div className="reason">
        <div className="reason-head">Почему подходит</div>
        {reason}
      </div>

      <div className="candidate-body">
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

      <div className="decide">
        <button className="btn btn-ghost" disabled={busy} onClick={() => onDecide('skip')}>
          Пропустить
        </button>
        <button className="btn" disabled={busy} onClick={() => onDecide('like')}>
          Интересно
        </button>
      </div>
    </article>
  );
}
