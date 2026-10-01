import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useSession } from '../store.jsx';
import CandidateCard from '../components/CandidateCard.jsx';
import Avatar from '../components/Avatar.jsx';

export default function Feed() {
  const { user, setUser, dictionaries } = useSession();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading', items: [], source: null, notice: null });
  const [busy, setBusy] = useState(false);
  const [match, setMatch] = useState(null);
  const [query, setQuery] = useState(user.request || '');
  const [queryBusy, setQueryBusy] = useState(false);

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

  const submitQuery = async () => {
    const value = query.trim();
    if (!value || queryBusy) return;
    setQueryBusy(true);
    try {
      const { user: updated } = await api('/profile', { method: 'PUT', body: { request: value } });
      setUser(updated);
      await load(true);
    } catch (e) {
      setState((s) => ({ ...s, notice: e.message }));
    } finally {
      setQueryBusy(false);
    }
  };

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

  const sourceLabel = {
    gigachat: 'Подбор GigaChat',
    cache: 'Из кэша подбора',
    fallback: 'Базовый подбор без ИИ',
  }[state.source];

  const queryChanged = query.trim() !== (user.request || '').trim();

  return (
    <div>
      <div className="page-head">
        <h1>Кто вам подходит</h1>
        <p>Опишите, кого ищете, — ИИ подберёт предпринимателей и объяснит совместимость каждого.</p>
      </div>

      <div className="query-panel">
        <span className="field-label">Кого вы ищете</span>
        <div className="query-row">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitQuery();
            }}
            placeholder="Например: ищу поставщика замороженной ягоды для кондитерского производства в ЦФО"
          />
          <button
            className="btn query-submit"
            onClick={submitQuery}
            disabled={queryBusy || !query.trim() || (!queryChanged && state.status === 'ready')}
          >
            {queryBusy ? '…' : 'Найти'}
          </button>
        </div>
      </div>

      {state.status !== 'error' && (
        <div className="feed-meta">
          <span>{sourceLabel || ' '}</span>
          <button className="btn-quiet" onClick={() => load(true)} disabled={state.status === 'loading'}>
            Пересчитать
          </button>
        </div>
      )}

      {state.notice && <div className="notice-box" style={{ marginBottom: 14 }}>{state.notice}</div>}

      {state.status === 'loading' && (
        <div className="skeleton">
          <span className="spinner" />
          GigaChat разбирает ваш запрос и сравнивает профили…
        </div>
      )}

      {state.status === 'error' && state.code === 'request_empty' && (
        <div className="empty">
          <h2>Опишите, кого ищете</h2>
          <p>Введите запрос выше и нажмите «Найти» — по этому тексту ИИ подберёт предпринимателей.</p>
        </div>
      )}

      {state.status === 'error' && state.code === 'profile_incomplete' && (
        <div className="empty">
          <h2>Подбор недоступен</h2>
          <p style={{ marginBottom: 18 }}>{state.error}</p>
          <button className="btn" onClick={() => navigate('/profile')}>
            Открыть профиль
          </button>
        </div>
      )}

      {state.status === 'error' && !['request_empty', 'profile_incomplete'].includes(state.code) && (
        <div className="empty">
          <h2>Подбор недоступен</h2>
          <p>{state.error}</p>
        </div>
      )}

      {state.status === 'ready' && state.items.length === 0 && (
        <div className="empty">
          <h2>Кандидаты закончились</h2>
          <p>
            Вы просмотрели всех, кто подходит под текущий запрос. Уточните формулировку выше —
            подбор пересчитается.
          </p>
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
