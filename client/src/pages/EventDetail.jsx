import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useSession } from '../store.jsx';
import Avatar from '../components/Avatar.jsx';
import Meter from '../components/Meter.jsx';
import {
  IconChevronLeft,
  IconSend,
  IconPin,
  IconVideo,
  IconCalendar,
  IconCheck,
} from '../components/Icons.jsx';
import { fullDate, timeRange, time, plural, whenLabel } from '../lib/dates.js';

const FORMAT_LABEL = { online: 'Онлайн', offline: 'Очно', hybrid: 'Очно и онлайн' };
const PARTICIPANTS_PREVIEW = 8;

export default function EventDetail() {
  const { id } = useParams();
  const { user, socket, socketReady } = useSession();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [tab, setTab] = useState('about');
  const [allParticipants, setAllParticipants] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const logRef = useRef(null);

  const load = useCallback(
    () =>
      api(`/events/${id}`)
        .then(setData)
        .catch((e) => setError(e.message)),
    [id]
  );

  useEffect(() => {
    load();
  }, [load]);

  const canChat = data?.event?.canChat;

  // В комнату чата пускают участников и ведущего.
  useEffect(() => {
    const s = socket.current;
    if (!s || !canChat) return;
    s.emit('event:join', { eventId: id });

    const onMessage = ({ eventId, message }) => {
      if (eventId !== id) return;
      setData((prev) =>
        prev && !prev.messages.some((m) => m.id === message.id)
          ? { ...prev, messages: [...prev.messages, message] }
          : prev
      );
    };
    const onSeats = ({ eventId, seatsTaken, seats }) => {
      if (eventId !== id) return;
      setData((prev) =>
        prev
          ? {
              ...prev,
              event: { ...prev.event, seatsTaken, seatsLeft: Math.max(0, seats - seatsTaken) },
            }
          : prev
      );
    };

    s.on('event:message', onMessage);
    s.on('event:seats', onSeats);
    return () => {
      s.emit('event:leave', { eventId: id });
      s.off('event:message', onMessage);
      s.off('event:seats', onSeats);
    };
  }, [id, canChat, socketReady]);

  useEffect(() => {
    if (tab === 'chat') {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [data?.messages?.length, tab]);

  const toggle = async () => {
    setBusy(true);
    setError('');
    try {
      await api(`/events/${id}/${data.event.registered ? 'cancel' : 'register'}`, { method: 'POST' });
      await load();
    } catch (e) {
      setError(e.message);
      if (e.code === 'no_seats') load();
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    const s = socket.current;
    if (s?.connected) {
      s.emit('event:message', { eventId: id, text: body }, (res) => {
        if (!res?.ok) setError('Сообщение не отправлено');
      });
    } else {
      try {
        const { message } = await api(`/events/${id}/messages`, {
          method: 'POST',
          body: { text: body },
        });
        setData((prev) => (prev ? { ...prev, messages: [...prev.messages, message] } : prev));
      } catch (e) {
        setError(e.message);
      }
    }
  };

  if (error && !data) return <div className="error-box">{error}</div>;
  if (!data) {
    return (
      <div className="skeleton">
        <span className="spinner" />
        Открываем встречу…
      </div>
    );
  }

  const { event, participants, messages } = data;
  const visibleParticipants = allParticipants
    ? participants
    : participants.slice(0, PARTICIPANTS_PREVIEW);
  const fillPct = event.seats ? (event.seatsTaken / event.seats) * 100 : 0;
  const full = !event.past && event.seatsLeft === 0;
  const scarce =
    !event.past && event.seatsLeft > 0 && event.seatsLeft <= Math.max(2, Math.round(event.seats * 0.12));

  return (
    <div className="event-page">
      <header className="event-topbar">
        <button className="icon-btn" onClick={() => navigate('/events')} aria-label="К списку встреч">
          <IconChevronLeft width={20} height={20} />
        </button>
        <span className="event-topbar-when">
          {event.past ? 'Встреча прошла' : whenLabel(event.startsAt)}
        </span>
      </header>

      <section className="event-hero">
        <h1>{event.title}</h1>
        <p className="event-hero-lead">{event.summary}</p>

        <dl className="event-facts">
          <div>
            <dt>
              <IconCalendar width={16} height={16} />
            </dt>
            <dd>
              {fullDate(event.startsAt)}, {timeRange(event.startsAt, event.endsAt)}
            </dd>
          </div>
          <div>
            <dt>
              {event.format === 'online' ? (
                <IconVideo width={16} height={16} />
              ) : (
                <IconPin width={16} height={16} />
              )}
            </dt>
            <dd>
              {FORMAT_LABEL[event.format]} — {event.place}
            </dd>
          </div>
        </dl>

        <div className="seat-panel">
          <Meter
            percent={fillPct}
            label={`${event.seatsTaken}/${event.seats}`}
            tone={event.past || full ? 'muted' : scarce ? 'amber' : 'brand'}
            size="lg"
          />
          <div className="seat-copy">
            <strong>
              {event.past
                ? `${event.seatsTaken} ${plural(event.seatsTaken, ['участник', 'участника', 'участников'])}`
                : full
                  ? 'Мест не осталось'
                  : `${event.seatsLeft} ${plural(event.seatsLeft, ['место', 'места', 'мест'])} свободно`}
            </strong>
            <p>
              {event.past
                ? 'Встреча завершена, чат участников остаётся открытым.'
                : full
                  ? 'Все слоты заняли раньше. Место освободится, если кто-то откажется.'
                  : 'Места занимают в порядке очереди — номер закрепляется за вами сразу.'}
            </p>

            {event.registered ? (
              <div className="seat-actions">
                <span className="event-badge">
                  <IconCheck width={15} height={15} />
                  {event.past ? 'Вы были' : `Место №${event.seatNo}`}
                </span>
                {!event.past && (
                  <button className="btn-quiet btn-quiet--sm" onClick={toggle} disabled={busy}>
                    {busy ? 'Освобождаем…' : 'Освободить место'}
                  </button>
                )}
              </div>
            ) : (
              <button className="btn" onClick={toggle} disabled={busy || full || event.past}>
                {busy ? 'Занимаем место…' : full ? 'Мест нет' : 'Занять место'}
              </button>
            )}
          </div>
        </div>

        {error && <div className="error-box notice-inline">{error}</div>}
      </section>

      <div className="segmented" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'about'}
          className={`seg ${tab === 'about' ? 'on' : ''}`}
          onClick={() => setTab('about')}
        >
          Программа
        </button>
        <button
          role="tab"
          aria-selected={tab === 'chat'}
          className={`seg ${tab === 'chat' ? 'on' : ''}`}
          onClick={() => setTab('chat')}
        >
          Чат участников
          {canChat && messages.length > 0 && <span className="seg-count">{messages.length}</span>}
        </button>
      </div>

      {tab === 'about' ? (
        <section className="stack">
          <div className="card">
            <p className="event-description">{event.description}</p>
            {event.topics?.length > 0 && (
              <div className="chips" style={{ marginTop: 14 }}>
                {event.topics.map((t) => (
                  <span key={t} className="tag">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {event.host && (
            <div className="card host-card">
              <Avatar user={event.host} />
              <div>
                <div className="host-name">{event.host.fullName}</div>
                <p className="muted">
                  {[event.host.position, event.host.company].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>
          )}

          {event.agenda?.length > 0 && (
            <div className="card">
              <h2 className="card-title">Как пройдёт встреча</h2>
              <ol className="agenda">
                {event.agenda.map((row) => (
                  <li key={row.time}>
                    <span className="agenda-time">{row.time}</span>
                    <span>{row.text}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="card">
            <h2 className="card-title">
              Кто идёт <span className="muted">{event.seatsTaken} из {event.seats}</span>
            </h2>
            {participants.length === 0 ? (
              <p className="muted">Мест ещё никто не занял — ваше будет первым.</p>
            ) : (
              <ul className="participants">
                {visibleParticipants.map((p) => (
                  <li key={p.id}>
                    <span className={`avatar-ring ${p.online ? 'online' : ''}`}>
                      <Avatar user={p} />
                    </span>
                    <div>
                      <div className="participant-name">
                        {p.fullName}
                        {p.id === user.id && <span className="you">вы</span>}
                      </div>
                      <p className="muted">{p.company || p.industry}</p>
                    </div>
                    <span className="seat-no">№{p.seatNo}</span>
                  </li>
                ))}
              </ul>
            )}
            {participants.length > PARTICIPANTS_PREVIEW && (
              <button className="btn-quiet" onClick={() => setAllParticipants((v) => !v)}>
                {allParticipants
                  ? 'Свернуть список'
                  : `Показать всех (${participants.length})`}
              </button>
            )}
          </div>
        </section>
      ) : canChat ? (
        <section className="event-chat">
          <div className="chat-log" ref={logRef}>
            {messages.length === 0 && (
              <p className="chat-empty">
                Чат открыт. Напишите, с каким вопросом идёте, — ведущий готовит разбор заранее.
              </p>
            )}
            {messages.map((m) => {
              const mine = m.authorId === user.id;
              const author = participants.find((p) => p.id === m.authorId);
              const isHost = m.authorId === event.host?.id;
              return (
                <div key={m.id} className={`group-msg ${mine ? 'mine' : ''}`}>
                  {!mine && <Avatar user={author || event.host} className="avatar-xs" />}
                  <div>
                    {!mine && (
                      <div className="group-msg-author">
                        {author?.fullName || event.host?.fullName || 'Участник'}
                        {isHost && <span className="host-mark">ведущий</span>}
                      </div>
                    )}
                    <div className="bubble">
                      {m.text}
                      <div className="bubble-meta">{time(m.createdAt)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="chat-form">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Сообщение участникам"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button className="send-btn" onClick={send} disabled={!text.trim()} aria-label="Отправить">
              <IconSend width={19} height={19} />
            </button>
          </div>
        </section>
      ) : (
        <div className="empty">
          <h2>Чат открыт участникам</h2>
          <p style={{ marginBottom: 18 }}>
            Займите место — и увидите переписку тех, кто идёт, вместе с материалами от ведущего.
          </p>
          <button className="btn" onClick={toggle} disabled={busy || full || event.past}>
            {full ? 'Мест нет' : 'Занять место'}
          </button>
        </div>
      )}
    </div>
  );
}
