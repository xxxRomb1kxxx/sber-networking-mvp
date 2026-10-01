import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useSession } from '../store.jsx';
import { IconSearch, IconChat, IconCalendar, IconUser, IconSliders } from './Icons.jsx';

const items = [
  { to: '/', label: 'Подбор', Icon: IconSearch, end: true },
  { to: '/matches', label: 'Мэтчи', Icon: IconChat, badge: 'unread' },
  { to: '/events', label: 'Встречи', Icon: IconCalendar, badge: 'events' },
  { to: '/profile', label: 'Профиль', Icon: IconUser },
  { to: '/settings', label: 'Настройки', Icon: IconSliders },
];

export default function Nav() {
  const { socket, socketReady } = useSession();
  const [unread, setUnread] = useState(0);
  const [myEvents, setMyEvents] = useState(0);
  const location = useLocation();
  // На экранах чата и встречи есть свой заголовок — общий бренд-бар там лишний.
  const showTopbar = !location.pathname.startsWith('/chat/') && !/^\/events\/.+/.test(location.pathname);

  const refresh = () =>
    api('/matches')
      .then(({ matches }) => setUnread(matches.reduce((n, m) => n + m.unread, 0)))
      .catch(() => {});

  const refreshEvents = () =>
    api('/events')
      .then(({ registeredCount }) => setMyEvents(registeredCount))
      .catch(() => {});

  useEffect(() => {
    refresh();
    refreshEvents();
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

  // Запись на встречу меняет счётчик «Встречи» без перезагрузки страницы.
  useEffect(() => {
    if (location.pathname.startsWith('/events')) refreshEvents();
  }, [location.pathname]);

  const badgeValue = { unread, events: myEvents };

  return (
    <>
      {showTopbar && (
        <header className="mobile-topbar">
          <span className="brand-logo brand-logo--sm">Сберконнект</span>
        </header>
      )}
      <nav className="nav">
        <div className="nav-brand">
          <span className="brand-logo brand-logo--md">Сберконнект</span>
        </div>
        <div className="nav-items">
          {items.map(({ to, label, Icon, end, badge }) => (
            <NavLink key={to} to={to} end={end} className="nav-item">
              <Icon className="nav-icon" aria-hidden="true" />
              {label}
              {badge && badgeValue[badge] > 0 && (
                <span className="nav-badge">{badgeValue[badge]}</span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
