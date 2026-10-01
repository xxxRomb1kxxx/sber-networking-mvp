/** Форматирование дат для раздела мероприятий. */

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MONTHS_LONG = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];
const MONTHS_TITLE = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

export const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

export const monthShort = (iso) => MONTHS_SHORT[new Date(iso).getMonth()];
export const dayNumber = (iso) => new Date(iso).getDate();

export const time = (iso) =>
  new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

export function timeRange(startIso, endIso) {
  return `${time(startIso)} – ${time(endIso)}`;
}

export function fullDate(iso) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`;
}

export function monthTitle(date) {
  return `${MONTHS_TITLE[date.getMonth()]} ${date.getFullYear()}`;
}

/** Ключ дня для сопоставления события с ячейкой календаря. */
export function dayKey(value) {
  const d = new Date(value);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** «Сегодня», «Завтра», «Через 4 дня» — иначе дата. */
export function whenLabel(iso) {
  const start = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(start);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((day - today) / 86400000);

  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Завтра';
  if (diff === 2) return 'Послезавтра';
  if (diff > 2 && diff < 8) return `Через ${diff} ${plural(diff, ['день', 'дня', 'дней'])}`;
  return fullDate(iso);
}

/** Склонение: 1 место, 2 места, 5 мест. */
export function plural(n, forms) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}
