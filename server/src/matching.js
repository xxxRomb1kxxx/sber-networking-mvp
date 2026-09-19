import crypto from 'node:crypto';
import { db, getCachedMatching, setCachedMatching, findMatchBetween } from './db.js';
import { rankCandidates, fallbackRank } from './gigachat.js';

/** Публичный вид профиля с учётом настроек приватности владельца. */
export function publicProfile(user) {
  const p = user.privacy || {};
  return {
    id: user.id,
    fullName: user.fullName,
    position: p.showPosition === false ? null : user.position,
    company: p.showCompany === false ? null : user.company,
    industry: user.industry,
    companySize: user.companySize,
    region: p.showRegion === false ? null : user.region,
    goals: user.goals || [],
    tags: user.tags || [],
    about: user.about,
    request: user.request,
    avatar: user.avatar,
    avatarColor: user.avatarColor || '#21A038',
  };
}

function queryHash(user) {
  return crypto
    .createHash('sha1')
    .update(
      JSON.stringify({
        request: user.request,
        about: user.about,
        industry: user.industry,
        region: user.region,
        goals: user.goals,
        tags: user.tags,
      })
    )
    .digest('hex')
    .slice(0, 16);
}

function candidatePool(user) {
  return db.data.users.filter((c) => {
    if (c.id === user.id) return false;
    if (!c.profileComplete) return false;
    const decided = db.data.likes.find((l) => l.fromUserId === user.id && l.toUserId === c.id);
    if (decided) return false;
    if (findMatchBetween(user.id, c.id)) return false;
    return true;
  });
}

/**
 * Подбор кандидатов: кэш → GigaChat → фолбэк по тегам.
 * source: 'cache' | 'gigachat' | 'fallback'
 */
export async function buildFeed(user, { refresh = false, limit = 20 } = {}) {
  const hash = queryHash(user);
  const pool = candidatePool(user);
  const poolIds = new Set(pool.map((c) => c.id));

  if (!refresh) {
    const cached = getCachedMatching(user.id, hash);
    if (cached) {
      const items = cached.items.filter((i) => poolIds.has(i.user_id));
      if (items.length) {
        return { source: 'cache', origin: cached.source, items: decorate(items, limit) };
      }
    }
  }

  if (!pool.length) return { source: 'empty', origin: null, items: [] };

  let items;
  let source;
  let notice = null;
  try {
    items = await rankCandidates({ user, candidates: pool });
    source = 'gigachat';
  } catch (err) {
    items = fallbackRank({ user, candidates: pool });
    source = 'fallback';
    notice = `ИИ-подбор временно недоступен (${err.message}). Показываем базовый подбор по тегам и отрасли.`;
  }

  setCachedMatching(user.id, hash, items, source);
  return { source, origin: source, notice, items: decorate(items, limit) };
}

function decorate(items, limit) {
  return items
    .slice(0, limit)
    .map((i) => {
      const candidate = db.data.users.find((u) => u.id === i.user_id);
      if (!candidate) return null;
      return {
        score: i.score,
        reason: i.reason,
        tags: i.tags || [],
        profile: publicProfile(candidate),
      };
    })
    .filter(Boolean);
}
