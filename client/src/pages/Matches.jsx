import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useSession } from '../store.jsx';
import Avatar from '../components/Avatar.jsx';

export default function Matches() {
  const { socket, socketReady } = useSession();
  const [matches, setMatches] = useState(null);
  const navigate = useNavigate();

  const load = useCallback(() => {
    api('/matches')
      .then(({ matches }) => setMatches(matches))
      .catch(() => setMatches([]));
  }, []);

  useEffect(() => {
    load();
    const s = socket.current;
    if (!s) return;
    s.on('message', load);
    s.on('match', load);
    s.on('presence', load);
    return () => {
      s.off('message', load);
      s.off('match', load);
      s.off('presence', load);
    };
  }, [load, socketReady]);

  if (matches === null) return <div className="skeleton"><span className="spinner" />Загружаем мэтчи…</div>;

  if (!matches.length) {
    return (
      <div className="empty">
        <h2>Мэтчей пока нет</h2>
        <p style={{ marginBottom: 18 }}>
          Чат открывается только при взаимном интересе. Отметьте кандидатов в подборе — и дождитесь
          ответа.
        </p>
        <button className="btn" onClick={() => navigate('/')}>
          К подбору
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <h1>Мэтчи</h1>
        <p>Диалоги с теми, кто ответил взаимностью.</p>
      </div>

      <div className="match-list">
        {matches.map((m) => (
          <Link key={m.id} to={`/chat/${m.id}`} className="match-row">
            <span className={`avatar-ring ${m.companion?.online ? 'online' : ''}`}>
              <Avatar user={m.companion} />
            </span>
            <div className="match-row-body">
              <div className="match-row-name">{m.companion?.fullName}</div>
              <div className="match-row-last">
                {m.lastMessage?.text || m.companion?.company || 'Диалог ещё не начат'}
              </div>
            </div>
            {m.unread > 0 && <span className="badge-count">{m.unread}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
