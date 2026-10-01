import { Router } from 'express';
import { requireAuth } from '../middleware.js';
import { updateUser, dropCache, findUser } from '../db.js';
import { publicProfile } from '../matching.js';

export const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.get('/', (req, res) => res.json({ user: req.user }));

profileRouter.put('/', (req, res) => {
  const b = req.body || {};
  const tags = Array.isArray(b.tags)
    ? b.tags
    : String(b.tags || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

  const patch = {
    industry: (b.industry ?? req.user.industry) || '',
    companySize: (b.companySize ?? req.user.companySize) || '',
    region: (b.region ?? req.user.region) || '',
    goals: Array.isArray(b.goals) ? b.goals : req.user.goals,
    about: (b.about ?? req.user.about) || '',
    request: (b.request ?? req.user.request) || '',
    tags: tags.slice(0, 10),
    avatarColor: b.avatarColor ?? req.user.avatarColor ?? '#47541F',
    privacy: { ...(req.user.privacy || {}), ...(b.privacy || {}) },
  };

  patch.profileComplete = Boolean(
    patch.industry && patch.region && patch.goals?.length && patch.about?.trim()
  );

  const user = updateUser(req.user.id, patch);
  // Профиль изменился — прошлый подбор больше не актуален (п. 6 ТЗ).
  dropCache(user.id);
  res.json({ user, needsOnboarding: !user.profileComplete });
});

profileRouter.get('/:id', (req, res) => {
  const user = findUser(req.params.id);
  if (!user) return res.status(404).json({ error: 'not_found', message: 'Профиль не найден' });
  res.json({ profile: publicProfile(user) });
});
