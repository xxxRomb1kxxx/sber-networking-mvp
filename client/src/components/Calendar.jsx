import { useMemo, useState } from 'react';
import { WEEKDAYS, dayKey, monthTitle } from '../lib/dates.js';
import { IconChevronLeft, IconChevronRight } from './Icons.jsx';

/** Начало недели — понедельник: смещение первого дня месяца в сетке. */
function leadingBlanks(firstDay) {
  return (firstDay.getDay() + 6) % 7;
}

export default function Calendar({ events, selectedDay, onSelectDay }) {
  const firstEvent = events[0];
  const [cursor, setCursor] = useState(() => {
    const base = firstEvent ? new Date(firstEvent.startsAt) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const byDay = useMemo(() => {
    const map = new Map();
    for (const e of events) {
      const key = dayKey(e.startsAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    }
    return map;
  }, [events]);

  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const blanks = leadingBlanks(cursor);
  const todayKey = dayKey(new Date());

  const shiftMonth = (delta) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  return (
    <section className="calendar">
      <header className="cal-head">
        <button className="icon-btn icon-btn--sm" onClick={() => shiftMonth(-1)} aria-label="Предыдущий месяц">
          <IconChevronLeft width={17} height={17} />
        </button>
        <h2 className="cal-title">{monthTitle(cursor)}</h2>
        <button className="icon-btn icon-btn--sm" onClick={() => shiftMonth(1)} aria-label="Следующий месяц">
          <IconChevronRight width={17} height={17} />
        </button>
      </header>

      <div className="cal-grid cal-weekdays" aria-hidden="true">
        {WEEKDAYS.map((w) => (
          <span key={w} className="cal-weekday">
            {w}
          </span>
        ))}
      </div>

      <div className="cal-grid">
        {Array.from({ length: blanks }).map((_, i) => (
          <span key={`blank-${i}`} className="cal-cell cal-cell--blank" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const date = new Date(cursor.getFullYear(), cursor.getMonth(), i + 1);
          const key = dayKey(date);
          const dayEvents = byDay.get(key) || [];
          const registered = dayEvents.some((e) => e.registered);

          if (!dayEvents.length) {
            return (
              <span key={key} className={`cal-cell ${key === todayKey ? 'is-today' : ''}`}>
                {i + 1}
              </span>
            );
          }

          return (
            <button
              key={key}
              className={`cal-cell cal-cell--has ${key === todayKey ? 'is-today' : ''} ${
                selectedDay === key ? 'is-selected' : ''
              }`}
              onClick={() => onSelectDay(key)}
              aria-pressed={selectedDay === key}
              aria-label={`${i + 1} ${monthTitle(cursor)}, встреч: ${dayEvents.length}`}
            >
              {i + 1}
              <span className={`cal-dot ${registered ? 'is-mine' : ''}`} />
            </button>
          );
        })}
      </div>

      <p className="cal-hint">
        {selectedDay
          ? 'Показаны встречи выбранного дня. Нажмите на день ещё раз, чтобы снять фильтр.'
          : 'Точка под числом — есть встреча. Залитая точка означает, что место у вас уже есть.'}
      </p>
    </section>
  );
}
