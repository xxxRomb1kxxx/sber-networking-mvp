import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useSession } from '../store.jsx';

const items = [
  { to: '/', label: 'Подбор', glyph: '◎', end: true },
  { to: '/matches', label: 'Мэтчи', glyph: '◍' },
  { to: '/profile', label: 'Профиль', glyph: '◐' },
  { to: '/settings', label: 'Настройки', glyph: '⚙' },
];

export default function Nav() {
  const { socket, socketReady } = useSession();
  const [unread, setUnread] = useState(0);

  const refresh = () =>
    api('/matches')
      .then(({ matches }) => setUnread(matches.reduce((n, m) => n + m.unread, 0)))
      .catch(() => {});

  useEffect(() => {
    refresh();
    const s = socket.current;
    if (!s) return;
    s.on('message', refresh);
    s.on('message:read', refresh);
    s.on('match', refresh);
    return () => {
      s.off('message', refresh);
      s.off('message:read', refresh);
      s.off('match', refresh);
    };
  }, [socketReady]);

  return (
    <nav className="nav">
      <div className="nav-brand">
        <span className="dot" />
        Деловые знакомства
      </div>
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} end={i.end} className="nav-item">
          <span className="nav-glyph" aria-hidden="true">
            {i.glyph}
          </span>
          {i.label}
          {i.to === '/matches' && unread > 0 && <span className="nav-badge">{unread}</span>}
        </NavLink>
      ))}
    </nav>
  );
}
