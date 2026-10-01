import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useSession } from '../store.jsx';
import { useCountUp } from '../hooks/useCountUp.js';

const privacyLabels = {
  showCompany: ['Показывать компанию', 'Название юрлица видно в карточке'],
  showPosition: ['Показывать должность', 'Роль видна до начала диалога'],
  showRegion: ['Показывать регион', 'Город виден в карточке кандидата'],
};

function AnimatedStat({ value, suffix = '' }) {
  const animated = useCountUp(typeof value === 'number' ? value : 0);
  if (typeof value !== 'number') return <b>—</b>;
  return (
    <b>
      {animated}
      {suffix}
    </b>
  );
}

export default function Settings() {
  const { user, setUser, logout } = useSession();
  const [mock, setMock] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    api('/mock/settings').then((d) => {
      setMock(d.mock);
      setPrompt(d.systemPrompt);
    });
    api('/mock/metrics').then(setMetrics);
  }, []);

  const togglePrivacy = async (key) => {
    const privacy = { ...user.privacy, [key]: !user.privacy[key] };
    const { user: updated } = await api('/profile', { method: 'PUT', body: { privacy } });
    setUser(updated);
  };

  const updateMock = async (patch) => {
    const { mock } = await api('/mock/settings', { method: 'PUT', body: patch });
    setMock(mock);
  };

  const resetDemo = async () => {
    if (!confirm('Сбросить демо-базу? Профили сида вернутся, лайки и чаты удалятся.')) return;
    await api('/mock/reset', { method: 'POST' });
    await logout();
  };

  return (
    <div>
      <div className="page-head">
        <h1>Настройки</h1>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <h2 style={{ marginBottom: 6 }}>Приватность</h2>
        {Object.entries(privacyLabels).map(([key, [title, hint]]) => (
          <div className="switch-row" key={key}>
            <div>
              <div>{title}</div>
              <p>{hint}</p>
            </div>
            <button
              className={`chip ${user.privacy?.[key] !== false ? 'on' : ''}`}
              onClick={() => togglePrivacy(key)}
            >
              {user.privacy?.[key] !== false ? 'Видно' : 'Скрыто'}
            </button>
          </div>
        ))}
      </div>

      {metrics && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h2 style={{ marginBottom: 12 }}>Метрики MVP</h2>
          <div className="metrics">
            <div className="metric">
              <AnimatedStat value={metrics.registeredUsers} />
              <span>вошли через СберБизнес ID</span>
            </div>
            <div className="metric">
              <AnimatedStat value={metrics.profilesCompletedPct} suffix="%" />
              <span>профилей заполнено</span>
            </div>
            <div className="metric">
              <AnimatedStat value={metrics.matchRatePct} suffix="%" />
              <span>взаимных от всех лайков</span>
            </div>
            <div className="metric">
              <AnimatedStat value={metrics.avgMinutesToFirstMessage} />
              <span>минут до первого сообщения</span>
            </div>
            <div className="metric">
              <AnimatedStat value={metrics.seatsFilledPct} suffix="%" />
              <span>мест на встречах занято</span>
            </div>
            <div className="metric">
              <AnimatedStat value={metrics.eventSignups} />
              <span>записей на встречи</span>
            </div>
          </div>
        </div>
      )}

      {mock && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h2 style={{ marginBottom: 6 }}>Демо-режим</h2>
          <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
            СберБизнес ID и GigaChat имитируются локально. Здесь можно проверить поведение
            приложения при сбоях и задержках.
          </p>

          <div className="switch-row">
            <div>
              <div>Сбой GigaChat</div>
              <p>Проверить фолбэк-подбор по тегам и отрасли</p>
            </div>
            <button
              className={`chip ${mock.gigachatFailureRate > 0 ? 'on' : ''}`}
              onClick={() => updateMock({ gigachatFailureRate: mock.gigachatFailureRate > 0 ? 0 : 1 })}
            >
              {mock.gigachatFailureRate > 0 ? 'Включён' : 'Выключен'}
            </button>
          </div>

          <div className="switch-row">
            <div>
              <div>Задержка ответа ИИ</div>
              <p>{mock.gigachatLatencyMs} мс</p>
            </div>
            <button
              className="chip"
              onClick={() =>
                updateMock({ gigachatLatencyMs: mock.gigachatLatencyMs >= 2400 ? 300 : mock.gigachatLatencyMs + 700 })
              }
            >
              Изменить
            </button>
          </div>

          <div className="switch-row">
            <div>
              <div>Вероятность ответного лайка</div>
              <p>{Math.round(mock.autoLikeBackRate * 100)}% у демо-профилей</p>
            </div>
            <button
              className="chip"
              onClick={() =>
                updateMock({ autoLikeBackRate: mock.autoLikeBackRate >= 0.9 ? 0.2 : mock.autoLikeBackRate + 0.25 })
              }
            >
              Изменить
            </button>
          </div>

          <div className="switch-row">
            <div>
              <div>Системный промпт подбора</div>
              <p>Тот же текст уйдёт в боевой GigaChat</p>
            </div>
            <button className="chip" onClick={() => setShowPrompt((v) => !v)}>
              {showPrompt ? 'Скрыть' : 'Показать'}
            </button>
          </div>

          {showPrompt && (
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                fontSize: 12.5,
                background: 'var(--surface-sunk)',
                padding: 12,
                borderRadius: 'var(--r-xs)',
                marginTop: 12,
                lineHeight: 1.5,
              }}
            >
              {prompt}
            </pre>
          )}
        </div>
      )}

      <div className="card stack">
        <button className="btn btn-ghost" onClick={logout}>
          Выйти
        </button>
        <button className="btn btn-danger" onClick={resetDemo}>
          Сбросить демо-данные
        </button>
      </div>
    </div>
  );
}
