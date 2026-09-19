import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useSession } from '../store.jsx';
import CandidateCard from '../components/CandidateCard.jsx';
import Avatar from '../components/Avatar.jsx';

export default function Feed() {
  const { user, dictionaries } = useSession();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading', items: [], source: null, notice: null });
  const [busy, setBusy] = useState(false);
  const [match, setMatch] = useState(null);

  const load = useCallback(async (refresh = false) => {
    setState((s) => ({ ...s, status: 'loading' }));
    try {
      const data = await api(`/feed${refresh ? '?refresh=1' : ''}`);
      setState({ status: 'ready', items: data.items, source: data.origin || data.source, notice: data.notice });
    } catch (e) {
      setState({ status: 'error', items: [], error: e.message, code: e.code });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (value) => {
    const current = state.items[0];
    if (!current || busy) return;
    setBusy(true);
    try {
      const { match } = await api('/feed/decision', {
        method: 'POST',
        body: { toUserId: current.profile.id, value },
      });
      setState((s) => ({ ...s, items: s.items.slice(1) }));
      if (match) setMatch(match);
    } catch (e) {
      setState((s) => ({ ...s, notice: e.message }));
    } finally {
      setBusy(false);
    }
  };

  if (state.status === 'error') {
    return (
      <div className="empty">
        <h2>Подбор недоступен</h2>
        <p style={{ marginBottom: 18 }}>{state.error}</p>
        <button className="btn" onClick={() => navigate('/profile')}>
          Открыть профиль
        </button>
      </div>
    );
  }

  const sourceLabel = {
    gigachat: 'Подбор GigaChat',
    cache: 'Из кэша подбора',
    fallback: 'Базовый подбор без ИИ',
  }[state.source];

  return (
    <div>
      <div className="page-head">
        <h1>Кто вам подходит</h1>
        <p>Запрос: {user.request || 'не задан'}</p>
      </div>

      <div className="feed-meta">
        <span>{sourceLabel || ' '}</span>
        <button className="btn-quiet" onClick={() => load(true)} disabled={state.status === 'loading'}>
          Пересчитать
        </button>
      </div>

      {state.notice && <div className="notice-box" style={{ marginBottom: 14 }}>{state.notice}</div>}

      {state.status === 'loading' && (
        <div className="skeleton">
          <span className="spinner" />
          GigaChat разбирает ваш запрос и сравнивает профили…
        </div>
      )}

      {state.status === 'ready' && state.items.length === 0 && (
        <div className="empty">
          <h2>Кандидаты закончились</h2>
          <p style={{ marginBottom: 18 }}>
            Вы просмотрели всех, кто подходит под текущий запрос. Измените формулировку в профиле —
            подбор пересчитается.
          </p>
          <button className="btn" onClick={() => navigate('/profile')}>
            Изменить запрос
          </button>
        </div>
      )}

      {state.status === 'ready' && state.items[0] && (
        <>
          <CandidateCard
            key={state.items[0].profile.id}
            item={state.items[0]}
            goals={dictionaries.goals}
            onDecide={decide}
            busy={busy}
          />
          <p className="swipe-hint">
            Свайп вправо — интересно, влево — пропустить. Осталось карточек: {state.items.length}
          </p>
        </>
      )}

      {match && (
        <div className="modal-backdrop" onClick={() => setMatch(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <Avatar user={match.companion} />
            <h2>Взаимный интерес</h2>
            <p>
              {match.companion?.fullName} тоже отметил вас. Чат открыт — напишите первым, пока тема
              свежая.
            </p>
            <button className="btn btn-wide" onClick={() => navigate(`/chat/${match.id}`)}>
              Открыть чат
            </button>
            <button className="btn-quiet" onClick={() => setMatch(null)}>
              Продолжить подбор
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
