/**
 * Имитация GigaChat API.
 *
 * Сетевых вызовов нет: «модель» — локальный анализатор, который повторяет
 * контракт настоящей интеграции. На вход — системный промпт и профили,
 * на выход — строгий JSON: score, обоснование, теги пересечения интересов.
 * При замене на боевой GigaChat меняется только функция callModel().
 */
import { config } from './config.js';
import { GOALS } from './seed.js';

export const SYSTEM_PROMPT = `Ты — эксперт по бизнес-нетворкингу в закрытом сервисе деловых знакомств для клиентов СберБизнеса.
Тебе дают профиль пользователя, его текстовый запрос и список профилей кандидатов.
Оцени, насколько каждый кандидат отвечает запросу пользователя, по шкале от 0 до 100.
Учитывай: совпадение потребности и предложения, отрасль, регион, размер компании, цели нетворкинга.
Верни ТОЛЬКО валидный JSON без пояснений в формате:
{"items":[{"user_id":"...","score":0-100,"reason":"1-2 предложения по-русски","tags":["..."]}]}`;

const STOP = new Set([
  'ищу', 'нужен', 'нужна', 'нужны', 'нужно', 'хочу', 'для', 'под', 'или', 'наши', 'наша',
  'который', 'которые', 'которым', 'нашего', 'свою', 'свой', 'себя', 'есть', 'быть',
  'компании', 'компания', 'бизнес', 'партнёра', 'нашей', 'если', 'уже', 'как', 'что',
]);

/** Грубая нормализация слова: нижний регистр + обрезка окончания. */
function norm(word) {
  const w = word.toLowerCase().replace(/ё/g, 'е');
  return w.length > 6 ? w.slice(0, 6) : w;
}

function tokens(text = '') {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-zа-яё0-9\s-]/gi, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOP.has(w))
      .map(norm)
  );
}

function overlap(a, b) {
  let n = 0;
  for (const t of a) if (b.has(t)) n += 1;
  return n;
}

/** Взаимодополняющие цели: кому кто интересен. */
const GOAL_FIT = {
  clients: ['suppliers', 'clients'],
  suppliers: ['clients', 'suppliers'],
  investment: ['investment'],
  mentorship: ['mentorship', 'experts'],
  experts: ['experts', 'mentorship', 'clients'],
  partnership: ['partnership'],
};

const INDUSTRY_LINKS = {
  'Сельское хозяйство': ['Производство', 'Оптовая торговля', 'HoReCa'],
  Производство: ['Оптовая торговля', 'Логистика', 'Розница и e-commerce', 'Строительство'],
  'Оптовая торговля': ['Производство', 'Логистика', 'Розница и e-commerce'],
  Логистика: ['Розница и e-commerce', 'Производство', 'Оптовая торговля'],
  'Розница и e-commerce': ['Логистика', 'Реклама и маркетинг', 'IT и разработка'],
  'IT и разработка': ['Розница и e-commerce', 'Профессиональные услуги', 'Образование'],
  HoReCa: ['Производство', 'Сельское хозяйство', 'Логистика'],
  Строительство: ['Производство', 'Профессиональные услуги'],
  'Профессиональные услуги': ['IT и разработка', 'Медицина', 'Строительство'],
  Медицина: ['Профессиональные услуги', 'IT и разработка'],
  'Реклама и маркетинг': ['Розница и e-commerce', 'Образование'],
  Образование: ['Профессиональные услуги', 'Реклама и маркетинг'],
};

function goalFit(user, candidate) {
  const wanted = new Set();
  for (const g of user.goals || []) for (const t of GOAL_FIT[g] || []) wanted.add(t);
  const matched = (candidate.goals || []).filter((g) => wanted.has(g));
  return matched;
}

function candidateText(c) {
  return [c.about, c.request, (c.tags || []).join(' '), c.industry].filter(Boolean).join(' ');
}

/** Ядро «модели»: считает скор и собирает обоснование. */
function evaluate(user, candidate) {
  const userTokens = tokens([user.request, user.about, (user.tags || []).join(' ')].join(' '));
  const candTokens = tokens(candidateText(candidate));

  const sharedTags = (user.tags || []).filter((t) =>
    (candidate.tags || []).some((ct) => norm(ct) === norm(t))
  );

  const requestHits = [...tokens(user.request)].filter((t) => candTokens.has(t));
  const textScore = Math.min(28, overlap(userTokens, candTokens) * 3.5);
  const requestScore = Math.min(22, requestHits.length * 5);
  const tagScore = Math.min(14, sharedTags.length * 6);

  const goals = goalFit(user, candidate);
  const goalScore = goals.length ? Math.min(16, 9 + goals.length * 3) : 0;

  const industryScore =
    candidate.industry === user.industry
      ? 6
      : (INDUSTRY_LINKS[user.industry] || []).includes(candidate.industry)
        ? 10
        : 0;

  const regionScore = candidate.region === user.region ? 6 : 0;

  const raw = 18 + textScore + requestScore + tagScore + goalScore + industryScore + regionScore;
  const score = Math.max(12, Math.min(97, Math.round(raw)));

  const goalNames = goals.map((g) => GOALS[g]).filter(Boolean);
  const matchTags = [...new Set([...sharedTags, ...(candidate.tags || []).slice(0, 2)])].slice(0, 4);

  const reason = buildReason({ user, candidate, goalNames, matchTags, industryScore, regionScore, score });

  return { user_id: candidate.id, score, reason, tags: matchTags };
}

function buildReason({ user, candidate, goalNames, matchTags, industryScore, regionScore, score }) {
  const parts = [];
  const company = candidate.company || candidate.fullName;

  if (matchTags.length) {
    parts.push(`${company} работает с темами «${matchTags.slice(0, 3).join('», «')}» — это пересекается с вашим запросом`);
  } else {
    parts.push(`${company} — ${candidate.industry.toLowerCase()}, смежная с вашей сфера`);
  }

  if (goalNames.length) {
    parts.push(`цели совпадают по направлению «${goalNames[0].toLowerCase()}»`);
  }
  if (industryScore >= 10) {
    parts.push(`отрасли дополняют друг друга: ${user.industry.toLowerCase()} и ${candidate.industry.toLowerCase()}`);
  }
  if (regionScore) {
    parts.push(`оба в регионе «${candidate.region}» — проще договориться о встрече`);
  }
  if (score < 45) {
    parts.push('пересечение частичное, стоит уточнить детали в переписке');
  }

  const sentence = parts.slice(0, 3).join(', ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Имитация вызова POST /chat/completions у GigaChat.
 * Возвращает строку с JSON — ровно как настоящая модель.
 */
async function callModel({ user, candidates }) {
  const latency = config.mock.gigachatLatencyMs;
  await sleep(latency * 0.6 + Math.random() * latency * 0.8);

  if (Math.random() < config.mock.gigachatFailureRate) {
    const err = new Error('GigaChat недоступен (имитация сбоя)');
    err.code = 'gigachat_unavailable';
    throw err;
  }

  const items = candidates
    .map((c) => evaluate(user, c))
    .sort((a, b) => b.score - a.score);

  return JSON.stringify({ items });
}

/**
 * Публичный метод адаптера: подбор кандидатов.
 * Бросает ошибку при «недоступности» — вызывающий код включает фолбэк.
 */
export async function rankCandidates({ user, candidates }) {
  const rawResponse = await callModel({ user, candidates, systemPrompt: SYSTEM_PROMPT });
  let parsed;
  try {
    parsed = JSON.parse(rawResponse);
  } catch {
    const err = new Error('GigaChat вернул невалидный JSON');
    err.code = 'gigachat_bad_json';
    throw err;
  }
  if (!parsed?.items?.length) {
    const err = new Error('GigaChat вернул пустой список');
    err.code = 'gigachat_empty';
    throw err;
  }
  return parsed.items;
}

/**
 * Фолбэк без ИИ: скоринг по тегам, отрасли и региону (п. 6 ТЗ).
 */
export function fallbackRank({ user, candidates }) {
  return candidates
    .map((c) => {
      const sharedTags = (user.tags || []).filter((t) =>
        (c.tags || []).some((ct) => norm(ct) === norm(t))
      );
      const sameIndustry = c.industry === user.industry;
      const linked = (INDUSTRY_LINKS[user.industry] || []).includes(c.industry);
      const score = Math.min(
        88,
        30 + sharedTags.length * 11 + (linked ? 12 : 0) + (sameIndustry ? 7 : 0) +
          (c.region === user.region ? 6 : 0) + goalFit(user, c).length * 5
      );
      const tags = sharedTags.length ? sharedTags : (c.tags || []).slice(0, 3);
      return {
        user_id: c.id,
        score,
        reason: `Подбор без ИИ: совпадение по тегам «${tags.slice(0, 3).join('», «')}» и отрасли «${c.industry}».`,
        tags: tags.slice(0, 4),
      };
    })
    .sort((a, b) => b.score - a.score);
}
