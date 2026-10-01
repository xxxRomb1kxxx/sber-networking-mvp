// Минимальный Router в духе Express: ровно то, чем пользуются роуты сервера.
function matchPath(pattern, path) {
  const want = pattern.split('/').filter(Boolean);
  const got = path.split('/').filter(Boolean);
  if (want.length !== got.length) return null;
  const params = {};
  for (let i = 0; i < want.length; i++) {
    if (want[i].startsWith(':')) params[want[i].slice(1)] = decodeURIComponent(got[i]);
    else if (want[i] !== got[i]) return null;
  }
  return params;
}

function runChain(fns, req, res, done) {
  let i = 0;
  const next = (err) => {
    if (err) return done(err);
    const fn = fns[i++];
    if (!fn) return done();
    try {
      const result = fn(req, res, next);
      if (result && typeof result.then === 'function') result.catch(next);
    } catch (e) {
      next(e);
    }
  };
  next();
}

export function Router() {
  const layers = [];
  const router = (req, res, done) => {
    let i = 0;
    const next = (err) => {
      if (err) return done(err);
      const layer = layers[i++];
      if (!layer) return done();

      if (layer.prefix) {
        const { prefix } = layer;
        const saved = req.path;
        if (prefix !== '/' && saved !== prefix && !saved.startsWith(`${prefix}/`)) return next();
        req.path = prefix === '/' ? saved : saved.slice(prefix.length) || '/';
        return runChain(layer.fns, req, res, (e) => {
          req.path = saved;
          next(e);
        });
      }

      if (layer.method !== req.method) return next();
      const params = matchPath(layer.path, req.path);
      if (!params) return next();
      req.params = params;
      runChain(layer.fns, req, res, next);
    };
    next();
  };

  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    router[method] = (path, ...fns) => {
      layers.push({ method: method.toUpperCase(), path, fns });
      return router;
    };
  }
  router.use = (prefix, ...fns) => {
    if (typeof prefix === 'function') layers.push({ prefix: '/', fns: [prefix, ...fns] });
    else layers.push({ prefix, fns });
    return router;
  };
  return router;
}

/** Выполняет запрос через router и возвращает ответ так, как его отдал бы сервер. */
export function dispatch(router, { method = 'GET', url, headers = {}, body }) {
  return new Promise((resolve) => {
    const parsed = new URL(url, 'http://local');
    const req = {
      method: method.toUpperCase(),
      path: parsed.pathname,
      query: Object.fromEntries(parsed.searchParams),
      headers: Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])),
      body,
      params: {},
    };
    const res = {
      statusCode: 200,
      contentType: 'text/html; charset=utf-8',
      status(code) {
        this.statusCode = code;
        return this;
      },
      type(t) {
        this.contentType = t === 'html' ? 'text/html; charset=utf-8' : t;
        return this;
      },
      json(data) {
        resolve({ status: this.statusCode, type: 'application/json', body: JSON.stringify(data) });
      },
      send(data) {
        if (typeof data === 'object') return this.json(data);
        resolve({ status: this.statusCode, type: this.contentType, body: String(data) });
      },
      redirect(location) {
        resolve({ status: 302, location });
      },
    };
    router(req, res, (err) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'server_error', message: 'Внутренняя ошибка сервера' });
      } else {
        res.status(404).json({ error: 'not_found', message: 'Не найдено' });
      }
    });
  });
}

const express = () => Router();
express.Router = Router;
export default express;
