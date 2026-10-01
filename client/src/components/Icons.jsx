/**
 * Простой набор линейных иконок (без внешних библиотек и иконных шрифтов),
 * чтобы интерфейс не полагался на юникод-глифы вроде «◎»/«✕».
 */
const base = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function IconSearch(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <line x1="16.2" y1="16.2" x2="20.5" y2="20.5" />
    </svg>
  );
}

export function IconChat(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6.2A2.2 2.2 0 0 1 6.2 4h11.6A2.2 2.2 0 0 1 20 6.2v7.6a2.2 2.2 0 0 1-2.2 2.2H9.4l-4.6 3.6a.5.5 0 0 1-.8-.4V6.2Z" />
    </svg>
  );
}

export function IconUser(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8.3" r="3.4" />
      <path d="M5 19.3c.9-3.4 3.7-5.2 7-5.2s6.1 1.8 7 5.2" />
    </svg>
  );
}

export function IconSliders(props) {
  return (
    <svg {...base} {...props}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <circle cx="15" cy="7" r="2" fill="var(--surface, #fff)" />
      <line x1="4" y1="12.5" x2="20" y2="12.5" />
      <circle cx="9" cy="12.5" r="2" fill="var(--surface, #fff)" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="16" cy="18" r="2" fill="var(--surface, #fff)" />
    </svg>
  );
}

export function IconHeart(props) {
  return (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
      <path d="M12 20.1s-7.3-4.5-9.8-9.1C0.7 7.2 2.3 3.8 5.7 3.3c2-.3 3.9.8 6.3 3.3 2.4-2.5 4.3-3.6 6.3-3.3 3.4.5 5 3.9 3.5 7.7C19.3 15.6 12 20.1 12 20.1Z" />
    </svg>
  );
}

export function IconClose(props) {
  return (
    <svg {...base} {...props}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

export function IconChevronLeft(props) {
  return (
    <svg {...base} {...props}>
      <polyline points="15 5 8 12 15 19" />
    </svg>
  );
}

export function IconSend(props) {
  return (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
      <path d="M3.4 11.3 20 3.6c.8-.4 1.7.4 1.3 1.3l-6.7 16.5c-.4.9-1.6.9-2-.1l-2.5-6.1-6.1-2.5c-1-.4-1-1.6-.1-2Z" />
    </svg>
  );
}

export function IconCalendar(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="5.5" width="17" height="15" rx="3" />
      <line x1="3.5" y1="10" x2="20.5" y2="10" />
      <line x1="8.5" y1="3" x2="8.5" y2="7" />
      <line x1="15.5" y1="3" x2="15.5" y2="7" />
    </svg>
  );
}

export function IconClock(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <polyline points="12 7.5 12 12 15 13.8" />
    </svg>
  );
}

export function IconPin(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}

export function IconVideo(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="6" width="12.5" height="12" rx="3" />
      <path d="M15.5 11.2l4.3-2.6a.6.6 0 0 1 .9.5v5.8a.6.6 0 0 1-.9.5l-4.3-2.6Z" />
    </svg>
  );
}

export function IconUsers(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="9.5" cy="8.5" r="3.2" />
      <path d="M3.6 19.2c.8-3 3.2-4.6 5.9-4.6s5.1 1.6 5.9 4.6" />
      <path d="M16.2 6.2a3.2 3.2 0 0 1 0 6.1" />
      <path d="M17.6 14.9c2 .5 3.5 2 4.1 4.3" />
    </svg>
  );
}

export function IconCheck(props) {
  return (
    <svg {...base} {...props}>
      <polyline points="4.5 12.6 9.5 17.5 19.5 6.8" />
    </svg>
  );
}

export function IconChevronRight(props) {
  return (
    <svg {...base} {...props}>
      <polyline points="9 5 16 12 9 19" />
    </svg>
  );
}
