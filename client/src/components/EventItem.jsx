import Meter from './Meter.jsx';
import { IconPin, IconVideo, IconCheck, IconUsers } from './Icons.jsx';
import { dayNumber, monthShort, timeRange, whenLabel, plural } from '../lib/dates.js';

const FORMAT_LABEL = { online: 'Онлайн', offline: 'Очно', hybrid: 'Очно и онлайн' };

export default function EventItem({ event, busy, onOpen, onToggle }) {
  const { seats, seatsTaken, seatsLeft, registered, past } = event;
  const fillPct = seats ? (seatsTaken / seats) * 100 : 0;
  const scarce = !past && seatsLeft > 0 && seatsLeft <= Math.max(2, Math.round(seats * 0.12));
  const full = !past && seatsLeft === 0;

  const seatText = past
    ? `${seatsTaken} ${plural(seatsTaken, ['участник', 'участника', 'участников'])}`
    : full
      ? 'Мест не осталось'
      : `${seatsLeft} ${plural(seatsLeft, ['место', 'места', 'мест'])} свободно`;

  return (
    <article className={`event-item ${past ? 'is-past' : ''}`}>
      <button className="event-date" onClick={onOpen} aria-label={`Открыть встречу: ${event.title}`}>
        <span className="event-day">{dayNumber(event.startsAt)}</span>
        <span className="event-month">{monthShort(event.startsAt)}</span>
      </button>

      <div className="event-main">
        <p className="event-when">
          {past ? 'Прошло' : whenLabel(event.startsAt)}, {timeRange(event.startsAt, event.endsAt)}
        </p>

        <h3 className="event-title">
          <button onClick={onOpen}>{event.title}</button>
        </h3>

        <p className="event-summary">{event.summary}</p>

        <div className="event-meta">
          <span>
            {event.format === 'online' ? (
              <IconVideo width={15} height={15} />
            ) : (
              <IconPin width={15} height={15} />
            )}
            {FORMAT_LABEL[event.format]}
          </span>
          <span>
            <IconUsers width={15} height={15} />
            Ведёт {event.host?.fullName}
          </span>
        </div>
      </div>

      <div className="event-side">
        <Meter
          percent={fillPct}
          label={`${seatsTaken}/${seats}`}
          tone={past || full ? 'muted' : scarce ? 'amber' : 'brand'}
          size="sm"
        />
        <span className={`event-seats ${scarce ? 'is-scarce' : ''} ${full ? 'is-full' : ''}`}>
          {seatText}
        </span>

        {registered ? (
          <>
            <span className="event-badge">
              <IconCheck width={15} height={15} />
              {past ? 'Вы были' : `Место №${event.seatNo}`}
            </span>
            {!past && (
              <button className="btn-quiet btn-quiet--sm" onClick={onToggle} disabled={busy}>
                {busy ? 'Освобождаем…' : 'Освободить место'}
              </button>
            )}
          </>
        ) : (
          <button className="btn btn-sm" onClick={onToggle} disabled={busy || full || past}>
            {busy ? 'Занимаем…' : full ? 'Мест нет' : 'Занять место'}
          </button>
        )}
      </div>
    </article>
  );
}
