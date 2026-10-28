// Sunucu API'si için ince fetch sarmalayıcıları.

const TIMEOUT_MS = 8000;

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status; // 0 = ağ hatası / zaman aşımı
  }
}

async function call(url, options = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, { ...options, signal: ctrl.signal });
  } catch {
    throw new ApiError(0, 'Bağlantı kurulamadı');
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Sunucu hatası');
  return data;
}

export function register() {
  return call('/api/register', { method: 'POST' });
}

export function submitScore({ token, date, scores }) {
  return call('/api/score', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token, date, scores }),
  });
}

export function getBoard(type, { game, date } = {}) {
  const q = new URLSearchParams({ type });
  if (game) q.set('game', game);
  if (date) q.set('date', date);
  return call('/api/board?' + q);
}

export function getMe(token, date) {
  return call('/api/me?' + new URLSearchParams({ date }), { headers: { 'x-sezgi-token': token } });
}

export function tournament(action, body = {}) {
  return call('/api/turnuva', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, ...body }),
  });
}
