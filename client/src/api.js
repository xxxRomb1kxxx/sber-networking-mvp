const TOKEN_KEY = 'sbn.token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  constructor(payload, status) {
    super(payload?.message || 'Не удалось выполнить запрос');
    this.code = payload?.error;
    this.status = status;
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
      const login = `${import.meta.env.BASE_URL}login`;
      if (!location.pathname.startsWith(login)) location.href = `${login}?expired=1`;
    }
    throw new ApiError(payload, res.status);
  }
  return payload;
}
