import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useSession } from '../store.jsx';
import EventItem from '../components/EventItem.jsx';
import Calendar from '../components/Calendar.jsx';
import { dayKey } from '../lib/dates.js';

const TABS = [
  { key: 'upcoming', label: 'Ближайшие' },
  { key: 'calendar', label: 'Календарь' },
  { key: 'mine', label: 'Мои' },
];

export default function Events() {
  const { socket, socketReady } = useSession();
  const navigate = useNavigate();
  const [events, setEvents] = useState(null);
  const [tab, setTab] = useState('upcoming');
  const [selectedDay, setSelectedDay] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    api('/events')
      .then(({ events }) => setEvents(events))
      .catch((e) => {
        setEvents([]);
        setNotice(e.message);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Места разбирают и другие участники — счётчик обновляем на лету.
  useEffect(() => {
    const s = socket.current;
    if (!s) return;
    const onSeats = ({ eventId, seatsTaken, seats }) =>
      setEvents((prev) =>
        prev?.map((e) =>
          e.id === eventId
            ? { ...e, seatsTaken, seatsLeft: Math.max(0, seats - seatsTaken) }
            : e
        )
      );
    s.on('event:seats', onSeats);
    return () => s.off('event:seats', onSeats);
  }, [socketReady]);

  const register = async (event) => {
    setBusyId(event.id);
    setNotice('');
    try {
      const path = event.registered ? 'cancel' : 'register';
      const { event: updated } = await api(`/events/${event.id}/${path}`, { method: 'POST' });
      setEvents((prev) => prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e)));
      if (!event.registered) {
        setNotice(`Место №${updated.seatNo} ваше. Чат участников открыт.`);
      }
    } catch (e) {
      setNotice(e.message);
      if (e.code === 'no_seats') load();
    } finally {
      setBusyId(null);
    }
  };

  const upcoming = useMemo(() => (events || []).filter((e) => !e.past), [events]);

  const visible = useMemo(() => {
    if (!events) return [];
    if (tab === 'mine') return events.filter((e) => e.registered);
    if (tab === 'calendar') {
      return selectedDay
        ? upcoming.filter((e) => dayKey(e.startsAt) === selectedDay)
        : upcoming;
    }
    return upcoming;
  }, [events, upcoming, tab, selectedDay]);

  if (events === null) {
    return (
      <div className="skeleton">
        <span className="spinner" />
        Собираем расписание клуба…
      </div>
    );
  }

  const mineCount = events.filter((e) => e.registered && !e.past).length;

  return (
    <div>
      <div className="page-head">
        <h1>Мероприятия</h1>
        <p>
          Встречи клуба «Сберконнект»: мастер-классы, разборы и завтраки. Мест ограниченное
          число — слот достаётся тому, кто занял его раньше.
        </p>
      </div>

      <div className="segmented" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`seg ${tab === t.key ? 'on' : ''}`}
            onClick={() => {
              setTab(t.key);
              setSelectedDay(null);
            }}
          >
            {t.label}
            {t.key === 'mine' && mineCount > 0 && <span className="seg-count">{mineCount}</span>}
          </button>
        ))}
      </div>

      {notice && <div className="notice-box notice-inline">{notice}</div>}

      {tab === 'calendar' && (
        <Calendar
          events={upcoming}
          selectedDay={selectedDay}
          onSelectDay={(key) => setSelectedDay((prev) => (prev === key ? null : key))}
        />
      )}

      {visible.length === 0 ? (
        <div className="empty">
          <h2>{tab === 'mine' ? 'Вы пока никуда не записаны' : 'В этот день встреч нет'}</h2>
          <p style={{ marginBottom: 18 }}>
            {tab === 'mine'
              ? 'Займите место на ближайшей встрече — чат участников откроется сразу после регистрации.'
              : 'Выберите другой день в календаре или посмотрите весь список ближайших встреч.'}
          </p>
          <button className="btn" onClick={() => { setTab('upcoming'); setSelectedDay(null); }}>
            Показать ближайшие
          </button>
        </div>
      ) : (
        <div className="event-list">
          {visible.map((e) => (
            <EventItem
              key={e.id}
              event={e}
              busy={busyId === e.id}
              onOpen={() => navigate(`/events/${e.id}`)}
              onToggle={() => register(e)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
